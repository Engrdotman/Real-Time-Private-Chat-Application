import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Message, UserProfile


class PrivateChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        self.other_user_id = self.scope["url_route"]["kwargs"]["user_id"]

        try:
            self.other_user = await self.get_user(self.other_user_id)
        except User.DoesNotExist:
            await self.close()
            return

        user_ids = sorted([self.user.id, self.other_user.id])
        self.room_group_name = f"chat_{user_ids[0]}_{user_ids[1]}"
        self.global_group_name = "global_online"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.global_group_name, self.channel_name)

        await self.accept()

        # Mark user online
        await self.set_online_status(True)
        await self.channel_layer.group_send(
            self.global_group_name,
            {"type": "user_status", "user_id": self.user.id, "is_online": True}
        )

        # Send message history
        try:
            msgs = await self.get_message_history()
            for msg in msgs:
                await self.send(text_data=json.dumps({
                    "action": "chat_message",
                    "id": msg.id,
                    "message": msg.content,
                    "file_url": msg.file.url if msg.file else None,
                    "sender_id": msg.sender.id,
                    "sender_username": msg.sender.username,
                    "receiver_id": msg.receiver.id,
                    "timestamp": msg.timestamp.isoformat(),
                    "is_read": msg.is_read,
                }))
        except Exception as e:
            print(f"Error loading message history: {e}")

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user.is_authenticated:
            await self.set_online_status(False)
            await self.channel_layer.group_send(
                self.global_group_name,
                {"type": "user_status", "user_id": self.user.id, "is_online": False}
            )
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if hasattr(self, 'global_group_name'):
            await self.channel_layer.group_discard(self.global_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action", "chat_message")

        # Handle read receipts
        if action == "mark_read":
            message_ids = data.get("message_ids", [])
            if message_ids:
                await self.mark_messages_read(message_ids)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "read_receipt",
                        "message_ids": message_ids,
                        "reader_id": self.user.id,
                    }
                )
            return

        # Handle chat message
        message_text = data.get("message", "")
        file_path = data.get("file_path", None)

        if not message_text and not file_path:
            return

        saved_msg = await self.save_message(self.user, self.other_user, message_text, file_path)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": saved_msg.id,
                "message": saved_msg.content,
                "file_url": saved_msg.file.url if saved_msg.file else None,
                "sender_id": self.user.id,
                "sender_username": self.user.username,
                "receiver_id": self.other_user.id,
                "timestamp": saved_msg.timestamp.isoformat(),
                "is_read": False,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "action": "chat_message",
            "id": event["id"],
            "message": event["message"],
            "file_url": event.get("file_url"),
            "sender_id": event["sender_id"],
            "sender_username": event["sender_username"],
            "receiver_id": event["receiver_id"],
            "timestamp": event["timestamp"],
            "is_read": event.get("is_read", False),
        }))

    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            "action": "user_status",
            "user_id": event["user_id"],
            "is_online": event["is_online"],
        }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            "action": "read_receipt",
            "message_ids": event["message_ids"],
            "reader_id": event["reader_id"],
        }))

    # ── DB helpers ──────────────────────────────────────────────────────────

    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)

    @database_sync_to_async
    def save_message(self, sender, receiver, content, file_path=None):
        msg = Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
        )
        if file_path:
            msg.file.name = file_path
            msg.save()
        return msg

    @database_sync_to_async
    def get_message_history(self):
        return list(
            Message.objects.filter(
                Q(sender=self.user, receiver=self.other_user) |
                Q(sender=self.other_user, receiver=self.user)
            ).order_by("timestamp")[:50]
        )

    @database_sync_to_async
    def set_online_status(self, is_online):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.is_online = is_online
        profile.save()

    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        Message.objects.filter(id__in=message_ids, receiver=self.user).update(is_read=True)
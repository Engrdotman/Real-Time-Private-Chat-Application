import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Message


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
        self.room_name = f"chat_{user_ids[0]}_{user_ids[1]}"
        self.room_group_name = f"chat_{user_ids[0]}_{user_ids[1]}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        try:
            messages = await self.get_message_history()
            for msg in messages:
                await self.send(text_data=json.dumps({
                    "message": msg.content,
                    "sender_id": msg.sender.id,
                    "sender_username": msg.sender.username,
                    "receiver_id": msg.receiver.id,
                    "timestamp": msg.timestamp.isoformat(),
                    "is_read": msg.is_read
                }))
        except Exception as e:
            print(f"Error loading message history: {e}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get("message")

        if not message:
            return

        saved_message = await self.save_message(self.user, self.other_user, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": saved_message.content,
                "sender_id": self.user.id,
                "sender_username": self.user.username,
                "receiver_id": self.other_user.id,
                "timestamp": saved_message.timestamp.isoformat(),
                "is_read": False
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "sender_id": event["sender_id"],
            "sender_username": event["sender_username"],
            "receiver_id": event["receiver_id"],
            "timestamp": event["timestamp"],
            "is_read": event.get("is_read", False)
        }))

    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)

    @database_sync_to_async
    def save_message(self, sender, receiver, content):
        return Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content
        )

    @database_sync_to_async
    def get_message_history(self):
        messages = Message.objects.filter(
            Q(sender=self.user, receiver=self.other_user) |
            Q(sender=self.other_user, receiver=self.user)
        ).order_by("timestamp")[:50]
        return list(messages)
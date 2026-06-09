from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_pic = models.ImageField(upload_to='profiles/', blank=True, null=True)
    status_text = models.CharField(max_length=100, default="Hey there! I am using .connect")
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


# ── Connection System ─────────────────────────────────────────────────────────

class UserConnection(models.Model):
    """
    Represents a directional connection request between two users.
    sender  → the user who initiated the request
    receiver → the user who received the request
    Unique together constraint prevents duplicate requests.
    """
    STATUS_PENDING  = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_BLOCKED = 'blocked'

    STATUS_CHOICES = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_BLOCKED, 'Blocked'),
    ]

    sender   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_connections')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_connections')
    status   = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Prevent duplicate requests in the same direction
        unique_together = ('sender', 'receiver')
        indexes = [
            models.Index(fields=['sender', 'status']),
            models.Index(fields=['receiver', 'status']),
        ]

    def clean(self):
        # Security: users cannot send a request to themselves
        if self.sender_id == self.receiver_id:
            raise ValidationError("Cannot send a connection request to yourself.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sender.username} → {self.receiver.username} [{self.status}]"


class BlockList(models.Model):
    """
    Tracks blocked relationships.
    blocker → the user who performed the block
    blocked → the user who was blocked
    """
    blocker  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking')
    blocked  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')
        indexes = [
            models.Index(fields=['blocker']),
            models.Index(fields=['blocked']),
        ]

    def clean(self):
        if self.blocker_id == self.blocked_id:
            raise ValidationError("Cannot block yourself.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


class PrivacySettings(models.Model):
    """
    Per-user privacy controls.
    Defaults to the most open setting so existing users are unaffected.
    """
    EVERYONE    = 'everyone'
    CONNECTIONS = 'connections'
    NOBODY      = 'nobody'

    REQUEST_CHOICES = [
        (EVERYONE,    'Everyone'),
        (CONNECTIONS, 'Connections of Connections'),
        (NOBODY,      'Nobody'),
    ]
    PROFILE_CHOICES = [
        (EVERYONE,    'Everyone'),
        (CONNECTIONS, 'Connections Only'),
    ]
    MESSAGE_CHOICES = [
        (EVERYONE,    'Everyone'),
        (CONNECTIONS, 'Connections Only'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='privacy')
    who_can_send_requests = models.CharField(max_length=15, choices=REQUEST_CHOICES, default=EVERYONE)
    who_can_view_profile  = models.CharField(max_length=15, choices=PROFILE_CHOICES, default=EVERYONE)
    who_can_message       = models.CharField(max_length=15, choices=MESSAGE_CHOICES, default=EVERYONE)

    def __str__(self):
        return f"{self.user.username}'s privacy settings"


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='chat_files/', blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username}: {self.content[:30]}"


class Group(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_groups')
    members = models.ManyToManyField(User, related_name='chat_groups')
    avatar = models.ImageField(upload_to='group_avatars/', blank=True, null=True)

    def __str__(self):
        return self.name


class GroupMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_messages')
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='group_files/', blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.username} in {self.group.name}: {self.content[:30]}"


class StatusStory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stories')
    image = models.ImageField(upload_to='stories/')
    caption = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name='liked_stories', blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username}'s Story at {self.timestamp}"


class StoryComment(models.Model):
    story = models.ForeignKey(StatusStory, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.username} on {self.story.user.username}'s Story: {self.content[:30]}"

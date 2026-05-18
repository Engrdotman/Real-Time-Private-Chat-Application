from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.db.models import Q
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.views.decorators.csrf import csrf_exempt
from .forms import SignUpForm, LoginForm
from .models import Message, UserProfile


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('chat')

    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.save()
            messages.success(request, 'Account created successfully! Please log in.')
            return redirect('login')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = SignUpForm()

    return render(request, 'signup.html', {'form': form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('chat')

    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            remember_me = form.cleaned_data.get('remember_me')

            user = authenticate(request, username=username, password=password)

            if user is None:
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(request, username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if user is not None:
                login(request, user)
                if not remember_me:
                    request.session.set_expiry(0)
                next_url = request.GET.get('next') or 'chat'
                return redirect(next_url)
            else:
                messages.error(request, 'Invalid email/username or password.')
    else:
        form = LoginForm()

    return render(request, 'login.html', {'form': form})


@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('login')


@login_required
def chat_view(request, user_id=None):
    # Ensure current user has a profile
    current_profile, _ = UserProfile.objects.get_or_create(user=request.user)

    all_users = User.objects.exclude(id=request.user.id)

    user_data = []
    for u in all_users:
        profile, _ = UserProfile.objects.get_or_create(user=u)

        last_msg = Message.objects.filter(
            Q(sender=request.user, receiver=u) | Q(sender=u, receiver=request.user)
        ).order_by('-timestamp').first()

        unread_count = Message.objects.filter(
            sender=u, receiver=request.user, is_read=False
        ).count()

        if last_msg:
            if last_msg.content:
                last_msg_text = last_msg.content
            elif last_msg.file:
                last_msg_text = 'Attachment 📎'
            else:
                last_msg_text = ''
        else:
            last_msg_text = f'Say hi to {u.username}'

        user_data.append({
            'id': u.id,
            'username': u.username,
            'is_online': profile.is_online,
            'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
            'status_text': profile.status_text,
            'last_message': last_msg_text,
            'last_message_time': last_msg.timestamp if last_msg else None,
            'unread_count': unread_count,
        })

    user_data.sort(
        key=lambda x: x['last_message_time'].timestamp() if x['last_message_time'] else 0,
        reverse=True
    )

    my_groups = Group.objects.filter(members=request.user)
    groups_data = [{
        'id': g.id,
        'name': g.name,
        'description': g.description,
        'avatar': g.avatar.url if g.avatar else None,
    } for g in my_groups]

    return render(request, 'chat.html', {
        'users': user_data,
        'groups': groups_data,
        'selected_user_id': user_id,
        'current_profile': current_profile,
    })


@login_required
def get_messages(request, user_id):
    other_user = get_object_or_404(User, id=user_id)
    msgs = Message.objects.filter(
        Q(sender=request.user, receiver=other_user) |
        Q(sender=other_user, receiver=request.user)
    ).order_by('timestamp')

    messages_data = [{
        'id': msg.id,
        'sender_id': msg.sender.id,
        'sender_username': msg.sender.username,
        'content': msg.content,
        'file_url': msg.file.url if msg.file else None,
        'timestamp': msg.timestamp.isoformat(),
        'is_read': msg.is_read,
    } for msg in msgs]

    return JsonResponse({'messages': messages_data})


@login_required
def get_users(request):
    users = User.objects.exclude(id=request.user.id).values('id', 'username')
    return JsonResponse({'users': list(users)})


@csrf_exempt
@login_required
def upload_attachment(request):
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        import os
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'chat_files')
        os.makedirs(upload_dir, exist_ok=True)
        fs = FileSystemStorage(
            location=upload_dir,
            base_url=settings.MEDIA_URL + 'chat_files/'
        )
        filename = fs.save(uploaded_file.name, uploaded_file)
        file_url = fs.url(filename)
        return JsonResponse({'file_url': file_url})
    return JsonResponse({'error': 'Invalid request'}, status=400)


@csrf_exempt
@login_required
def update_profile(request):
    if request.method == 'POST':
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if 'profile_pic' in request.FILES:
            profile.profile_pic = request.FILES['profile_pic']

        if 'status_text' in request.POST:
            profile.status_text = request.POST['status_text']

        profile.save()
        return JsonResponse({
            'status': 'success',
            'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
            'status_text': profile.status_text,
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)


from datetime import timedelta
from django.utils import timezone
from .models import Group, GroupMessage, StatusStory, StoryComment

@csrf_exempt
@login_required
def create_group(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        members_raw = request.POST.getlist('members')
        
        if not name:
            return JsonResponse({'error': 'Group name is required'}, status=400)
            
        group = Group.objects.create(name=name, description=description, created_by=request.user)
        group.members.add(request.user)
        for m_id in members_raw:
            try:
                user = User.objects.get(id=m_id)
                group.members.add(user)
            except User.DoesNotExist:
                pass
                
        if 'avatar' in request.FILES:
            group.avatar = request.FILES['avatar']
            group.save()
            
        return JsonResponse({
            'status': 'success',
            'group': {
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'avatar': group.avatar.url if group.avatar else None,
            }
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def get_group_messages(request, group_id):
    group = get_object_or_404(Group, id=group_id, members=request.user)
    messages = group.messages.all().order_by('timestamp')
    
    messages_data = [{
        'id': msg.id,
        'sender_id': msg.sender.id,
        'sender_username': msg.sender.username,
        'content': msg.content,
        'file_url': msg.file.url if msg.file else None,
        'timestamp': msg.timestamp.isoformat(),
    } for msg in messages]
    
    return JsonResponse({'messages': messages_data})


@csrf_exempt
@login_required
def upload_story(request):
    if request.method == 'POST' and request.FILES.get('image'):
        image = request.FILES['image']
        caption = request.POST.get('caption', '')
        
        story = StatusStory.objects.create(user=request.user, image=image, caption=caption)
        
        return JsonResponse({
            'status': 'success',
            'story': {
                'id': story.id,
                'image': story.image.url,
                'caption': story.caption,
                'timestamp': story.timestamp.isoformat(),
            }
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def get_active_stories(request):
    time_threshold = timezone.now() - timedelta(hours=24)
    stories = StatusStory.objects.filter(timestamp__gte=time_threshold).order_by('-timestamp')
    
    stories_data = []
    for story in stories:
        liked_by_me = story.likes.filter(id=request.user.id).exists()
        comments = [{
            'id': c.id,
            'username': c.user.username,
            'content': c.content,
            'timestamp': c.timestamp.isoformat(),
        } for c in story.comments.all()]
        
        stories_data.append({
            'id': story.id,
            'user_id': story.user.id,
            'username': story.user.username,
            'user_avatar': story.user.profile.profile_pic.url if hasattr(story.user, 'profile') and story.user.profile.profile_pic else None,
            'image': story.image.url,
            'caption': story.caption,
            'timestamp': story.timestamp.isoformat(),
            'likes_count': story.likes.count(),
            'liked_by_me': liked_by_me,
            'comments': comments,
        })
        
    return JsonResponse({'stories': stories_data})


@csrf_exempt
@login_required
def toggle_like_story(request, story_id):
    if request.method == 'POST':
        story = get_object_or_404(StatusStory, id=story_id)
        if story.likes.filter(id=request.user.id).exists():
            story.likes.remove(request.user)
            liked = False
        else:
            story.likes.add(request.user)
            liked = True
        return JsonResponse({
            'status': 'success',
            'liked': liked,
            'likes_count': story.likes.count(),
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)


@csrf_exempt
@login_required
def comment_on_story(request, story_id):
    if request.method == 'POST':
        import json
        try:
            data = json.loads(request.body)
            content = data.get('content')
        except Exception:
            content = request.POST.get('content')
            
        if not content:
            return JsonResponse({'error': 'Comment content is required'}, status=400)
            
        story = get_object_or_404(StatusStory, id=story_id)
        comment = StoryComment.objects.create(story=story, user=request.user, content=content)
        
        return JsonResponse({
            'status': 'success',
            'comment': {
                'id': comment.id,
                'username': comment.user.username,
                'content': comment.content,
                'timestamp': comment.timestamp.isoformat(),
            }
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)
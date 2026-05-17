from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db.models import Q
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
    UserProfile.objects.get_or_create(user=request.user)
    users = User.objects.exclude(id=request.user.id)
    
    user_data = []
    for u in users:
        UserProfile.objects.get_or_create(user=u)
        last_msg = Message.objects.filter(
            Q(sender=request.user, receiver=u) | Q(sender=u, receiver=request.user)
        ).order_by('-timestamp').first()
        
        unread_count = Message.objects.filter(
            sender=u, receiver=request.user, is_read=False
        ).count()
        
        last_msg_text = 'Say hi to ' + u.username
        if last_msg:
            if last_msg.content:
                last_msg_text = last_msg.content
            elif last_msg.file:
                last_msg_text = 'Attachment 📎'
                
        user_data.append({
            'id': u.id,
            'username': u.username,
            'is_online': u.profile.is_online,
            'profile_pic': u.profile.profile_pic.url if u.profile.profile_pic else None,
            'status_text': u.profile.status_text,
            'last_message': last_msg_text,
            'last_message_time': last_msg.timestamp if last_msg else None,
            'unread_count': unread_count,
        })
        
    user_data.sort(key=lambda x: x['last_message_time'].timestamp() if x['last_message_time'] else 0, reverse=True)

    current_profile, _ = UserProfile.objects.get_or_create(user=request.user)

    return render(request, 'chat.html', {
        'users': user_data,
        'selected_user_id': user_id,
        'current_profile': current_profile
    })


@login_required
def get_messages(request, user_id):
    other_user = get_object_or_404(User, id=user_id)
    messages = Message.objects.filter(
        sender=request.user, receiver=other_user
    ) | Message.objects.filter(
        sender=other_user, receiver=request.user
    )
    messages = messages.order_by("timestamp")

    messages_data = [{
        "id": msg.id,
        "sender_id": msg.sender.id,
        "sender_username": msg.sender.username,
        "content": msg.content,
        "file_url": msg.file.url if msg.file else None,
        "timestamp": msg.timestamp.isoformat(),
        "is_read": msg.is_read
    } for msg in messages]

    return JsonResponse({"messages": messages_data})


@login_required
def get_users(request):
    users = User.objects.exclude(id=request.user.id).values("id", "username")
    return JsonResponse({"users": list(users)})

@csrf_exempt
@login_required
def upload_attachment(request):
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        fs = FileSystemStorage(location=settings.MEDIA_ROOT + '/chat_files/', base_url=settings.MEDIA_URL + 'chat_files/')
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
            'status_text': profile.status_text
        })
    return JsonResponse({'error': 'Invalid request'}, status=400)
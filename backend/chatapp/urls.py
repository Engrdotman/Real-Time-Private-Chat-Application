from django.urls import path, re_path
from . import views

urlpatterns = [
    # Catch-all route for React: Matches everything except paths starting with api/ or legacy/
    re_path(r'^(?!api/|legacy/|media/|static/|signup/|login/|logout/|admin/).*$', views.react_app, name='react_app'),
    
    path('legacy/', views.chat_view, name='chat'),
    path('legacy/chat/<int:user_id>/', views.chat_view, name='private_chat'),
    path('api/messages/<int:user_id>/', views.get_messages, name='get_messages'),
    path('api/users/', views.get_users, name='get_users'),
    path('api/session/', views.api_session, name='api_session'),
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/auth/signup/', views.api_signup, name='api_signup'),
    path('api/upload/', views.upload_attachment, name='upload_attachment'),
    path('api/profile/update/', views.update_profile, name='update_profile'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    # Group Chats
    path('api/groups/create/', views.create_group, name='create_group'),
    path('api/groups/<int:group_id>/messages/', views.get_group_messages, name='get_group_messages'),
    # Status Stories
    path('api/stories/create/', views.upload_story, name='upload_story'),
    path('api/stories/', views.get_active_stories, name='get_active_stories'),
    path('api/stories/<int:story_id>/like/', views.toggle_like_story, name='toggle_like_story'),
    path('api/stories/<int:story_id>/comment/', views.comment_on_story, name='comment_on_story'),
]

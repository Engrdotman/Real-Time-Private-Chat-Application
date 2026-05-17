from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat_view, name='chat'),
    path('chat/<int:user_id>/', views.chat_view, name='private_chat'),
    path('api/messages/<int:user_id>/', views.get_messages, name='get_messages'),
    path('api/users/', views.get_users, name='get_users'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
]
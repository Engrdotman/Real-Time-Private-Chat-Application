from django.conf import settings
from django.urls import path, re_path
from django.views.static import serve as static_serve
from . import views
from . import connection_views as cv

urlpatterns = [
    # Catch-all route for React: Matches everything except paths starting with api/ or legacy/
    path(
        'assets/<path:path>',
        static_serve,
        {'document_root': settings.BASE_DIR.parent / 'frontend' / 'static' / 'react' / 'assets'},
        name='react_asset_fallback',
    ),
    re_path(r'^(?!api/|legacy/|media/|static/|assets/|signup/|login/|logout/|admin/).*$', views.react_app, name='react_app'),
    
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

    # ── User Discovery & Connection System ────────────────────────────────────
    path('api/users/search/',              cv.search_users,              name='search_users'),
    path('api/users/block/',               cv.block_user,                name='block_user'),
    path('api/users/unblock/',             cv.unblock_user,              name='unblock_user'),
    path('api/users/privacy/',             cv.get_privacy_settings,      name='get_privacy_settings'),
    path('api/users/privacy/update/',      cv.update_privacy_settings,   name='update_privacy_settings'),
    path('api/users/search',               cv.search_users,              name='search_users_no_slash'),
    path('api/users/block',                cv.block_user,                name='block_user_no_slash'),
    path('api/users/unblock',              cv.unblock_user,              name='unblock_user_no_slash'),
    path('api/users/privacy',              cv.get_privacy_settings,      name='get_privacy_settings_no_slash'),
    path('api/users/privacy/update',       cv.update_privacy_settings,   name='update_privacy_settings_no_slash'),
    path('api/connections/send/',          cv.send_connection_request,   name='send_connection_request'),
    path('api/connections/cancel/',        cv.cancel_connection_request, name='cancel_connection_request'),
    path('api/connections/accept/',        cv.accept_connection_request, name='accept_connection_request'),
    path('api/connections/reject/',        cv.reject_connection_request, name='reject_connection_request'),
    path('api/connections/remove/',        cv.remove_connection,         name='remove_connection'),
    path('api/connections/suggestions/',   cv.get_suggestions,           name='get_suggestions'),
    path('api/connections/pending/',       cv.get_pending_requests,      name='get_pending_requests'),
    path('api/connections/recent/',        cv.get_recent_connections,    name='get_recent_connections'),
    path('api/connections/send',           cv.send_connection_request,   name='send_connection_request_no_slash'),
    path('api/connections/cancel',         cv.cancel_connection_request, name='cancel_connection_request_no_slash'),
    path('api/connections/accept',         cv.accept_connection_request, name='accept_connection_request_no_slash'),
    path('api/connections/reject',         cv.reject_connection_request, name='reject_connection_request_no_slash'),
    path('api/connections/remove',         cv.remove_connection,         name='remove_connection_no_slash'),
    path('api/connections/suggestions',    cv.get_suggestions,           name='get_suggestions_no_slash'),
    path('api/connections/pending',        cv.get_pending_requests,      name='get_pending_requests_no_slash'),
    path('api/connections/recent',         cv.get_recent_connections,    name='get_recent_connections_no_slash'),
]

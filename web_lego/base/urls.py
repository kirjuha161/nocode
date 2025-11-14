from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('login/', views.user_login, name='login'),
    path('dashboard/', views.dashboard, name='dashboard'), 
    path('create/', views.create_website, name='create_website'),
    path('edit/<int:website_id>/', views.edit_website, name='edit_website'),
    path('view/<int:website_id>/', views.view_website, name='view_website'),
    path('websites/<int:website_id>/delete/', views.delete_website, name='delete_website'),
    
    # API endpoints для блоков
    path('api/websites/<int:website_id>/blocks/', views.api_create_block, name='api_create_block'),
    path('api/blocks/<int:block_id>/', views.api_get_block, name='api_get_block'),
    path('api/blocks/<int:block_id>/update/', views.api_update_block, name='api_update_block'),
    path('api/blocks/<int:block_id>/delete/', views.api_delete_block, name='api_delete_block'),
    path('api/blocks/<int:block_id>/upload-image/', views.api_upload_block_image, name='api_upload_block_image'),
    path('api/blocks/<int:block_id>/upload-slider-image/', views.api_upload_slider_image, name='api_upload_slider_image'),
    path('api/websites/<int:website_id>/blocks/reorder/', views.api_reorder_blocks, name='api_reorder_blocks'),
]
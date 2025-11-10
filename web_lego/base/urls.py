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
]
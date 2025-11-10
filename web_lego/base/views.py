from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.contrib import messages  
from .models import Website
from .forms import RegisterForm
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm

def home(request):
    return render(request, 'base/home.html')

def user_login(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('dashboard')
    else:
        form = AuthenticationForm()
    
    return render(request, 'base/login.html', {'form': form})

def register(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('dashboard')
    else:
        form = RegisterForm()
    
    return render(request, 'base/register.html', {'form': form})

@login_required
def dashboard(request):
    websites = Website.objects.filter(owner=request.user)
    return render(request, 'base/dashboard.html', {'websites': websites})

@login_required
def create_website(request):
    if request.method == 'POST':
        website = Website.objects.create(
            title=request.POST.get('title', 'Мой сайт'),
            owner=request.user
        )
        return redirect('edit_website', website_id=website.id)
    return render(request, 'base/create_website.html')

@login_required
def edit_website(request, website_id):
    website = get_object_or_404(Website, id=website_id, owner=request.user)
    
    if request.method == 'POST':
        website.title = request.POST.get('title', website.title)
        website.background_color = request.POST.get('background_color', website.background_color)
        website.text_color = request.POST.get('text_color', website.text_color)
        website.header_content = request.POST.get('header_content', website.header_content)
        website.main_content = request.POST.get('main_content', website.main_content)
        website.footer_content = request.POST.get('footer_content', website.footer_content)
        website.save()
        
        messages.success(request, 'Изменения сохранены успешно!')
        return redirect('edit_website', website_id=website.id)
    
    return render(request, 'base/edit_website.html', {'website': website})

def view_website(request, website_id):
    website = get_object_or_404(Website, id=website_id)
    return render(request, 'base/view_website.html', {'website': website})

@login_required
def delete_website(request, website_id):
    website = get_object_or_404(Website, id=website_id)
    if request.user == website.owner:
        website.delete()
        return redirect('dashboard')
    return redirect('dashboard')
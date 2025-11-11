from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.contrib import messages  
from .models import Website, Block
from .forms import RegisterForm
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.db import models
import json

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
    blocks = website.blocks.filter(is_active=True)
    
    if request.method == 'POST':
        # Обновление основных настроек сайта
        website.title = request.POST.get('title', website.title)
        website.background_color = request.POST.get('background_color', website.background_color)
        website.text_color = request.POST.get('text_color', website.text_color)
        website.font_family = request.POST.get('font_family', website.font_family)
        
        # Настройки Header
        website.header_company_name = request.POST.get('header_company_name', website.header_company_name)
        website.header_background_color = request.POST.get('header_background_color', website.header_background_color)
        website.header_text_color = request.POST.get('header_text_color', website.header_text_color)
        website.header_show = request.POST.get('header_show') == 'on'
        if 'header_logo' in request.FILES:
            website.header_logo = request.FILES['header_logo']
        
        # Настройки Footer
        website.footer_background_color = request.POST.get('footer_background_color', website.footer_background_color)
        website.footer_text_color = request.POST.get('footer_text_color', website.footer_text_color)
        website.footer_content = request.POST.get('footer_content', website.footer_content)
        website.footer_show = request.POST.get('footer_show') == 'on'
        
        website.save()
        
        messages.success(request, 'Изменения сохранены успешно!')
        return redirect('edit_website', website_id=website.id)
    
    return render(request, 'base/edit_website.html', {
        'website': website,
        'blocks': blocks
    })

@xframe_options_exempt
def view_website(request, website_id):
    website = get_object_or_404(Website, id=website_id)
    blocks = website.blocks.filter(is_active=True)
    return render(request, 'base/view_website.html', {
        'website': website,
        'blocks': blocks
    })

@login_required
def delete_website(request, website_id):
    website = get_object_or_404(Website, id=website_id)
    if request.user == website.owner:
        website.delete()
        return redirect('dashboard')
    return redirect('dashboard')


# API endpoints для работы с блоками
@login_required
@require_http_methods(["POST"])
def api_create_block(request, website_id):
    """Создать новый блок"""
    website = get_object_or_404(Website, id=website_id, owner=request.user)
    
    try:
        data = json.loads(request.body)
        block_type = data.get('block_type', 'text')
        
        # Получаем максимальный порядок
        max_order = Block.objects.filter(website=website).aggregate(models.Max('order'))['order__max'] or 0
        
        block = Block.objects.create(
            website=website,
            block_type=block_type,
            order=max_order + 1,
            data=data.get('data', {})
        )
        
        return JsonResponse({
            'success': True,
            'block': {
                'id': block.id,
                'block_type': block.block_type,
                'order': block.order,
                'data': block.get_data()
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["GET"])
def api_get_block(request, block_id):
    """Получить информацию о блоке"""
    block = get_object_or_404(Block, id=block_id)
    
    if block.website.owner != request.user:
        return JsonResponse({'success': False, 'error': 'Нет доступа'}, status=403)
    
    return JsonResponse({
        'success': True,
        'block': {
            'id': block.id,
            'block_type': block.block_type,
            'order': block.order,
            'data': block.get_data(),
            'image_url': block.image.url if block.image else None
        }
    })


@login_required
@require_http_methods(["PUT", "PATCH"])
def api_update_block(request, block_id):
    """Обновить блок"""
    block = get_object_or_404(Block, id=block_id)
    
    if block.website.owner != request.user:
        return JsonResponse({'success': False, 'error': 'Нет доступа'}, status=403)
    
    try:
        # Проверяем, есть ли загруженный файл
        if request.FILES and 'image' in request.FILES:
            block.image = request.FILES['image']
            block.save()
            return JsonResponse({
                'success': True,
                'block': {
                    'id': block.id,
                    'block_type': block.block_type,
                    'order': block.order,
                    'data': block.get_data(),
                    'image_url': block.image.url if block.image else None
                }
            })
        
        # Обычное обновление через JSON
        if not request.body:
            return JsonResponse({'success': False, 'error': 'Нет данных для обновления'}, status=400)
        
        data = json.loads(request.body)
        
        if 'data' in data:
            block.data = data['data']
        if 'order' in data:
            block.order = data['order']
        if 'is_active' in data:
            block.is_active = data['is_active']
        if 'background_color' in data:
            block.background_color = data['background_color']
        if 'text_color' in data:
            block.text_color = data['text_color']
        if 'padding' in data:
            block.padding = data['padding']
        if 'margin' in data:
            block.margin = data['margin']
        
        block.save()
        
        return JsonResponse({
            'success': True,
            'block': {
                'id': block.id,
                'block_type': block.block_type,
                'order': block.order,
                'data': block.get_data(),
                'image_url': block.image.url if block.image else None
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["DELETE"])
def api_delete_block(request, block_id):
    """Удалить блок"""
    block = get_object_or_404(Block, id=block_id)
    
    if block.website.owner != request.user:
        return JsonResponse({'success': False, 'error': 'Нет доступа'}, status=403)
    
    block.delete()
    return JsonResponse({'success': True})


@login_required
@require_http_methods(["POST"])
def api_reorder_blocks(request, website_id):
    """Изменение порядка блоков"""
    website = get_object_or_404(Website, id=website_id, owner=request.user)
    
    try:
        data = json.loads(request.body)
        block_orders = data.get('blocks', [])  # [{'id': 1, 'order': 0}, ...]
        
        for item in block_orders:
            block = Block.objects.get(id=item['id'], website=website)
            block.order = item['order']
            block.save()
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def api_upload_block_image(request, block_id):
    """Загрузить изображение для блока"""
    block = get_object_or_404(Block, id=block_id)
    
    if block.website.owner != request.user:
        return JsonResponse({'success': False, 'error': 'Нет доступа'}, status=403)
    
    if 'image' not in request.FILES:
        return JsonResponse({'success': False, 'error': 'Изображение не предоставлено'}, status=400)
    
    try:
        block.image = request.FILES['image']
        block.save()
        
        return JsonResponse({
            'success': True,
            'image_url': block.image.url,
            'block_id': block.id
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
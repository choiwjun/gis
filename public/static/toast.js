// Toast Notification System

class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `
      transform transition-all duration-300 ease-in-out
      px-6 py-4 rounded-lg shadow-lg max-w-sm
      flex items-center gap-3
      ${this.getTypeClasses(type)}
    `;
    
    const icon = this.getIcon(type);
    const iconEl = document.createElement('i');
    iconEl.className = icon;
    
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.className = 'flex-1';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.className = 'opacity-70 hover:opacity-100 transition';
    closeBtn.onclick = () => this.remove(toast);
    
    toast.appendChild(iconEl);
    toast.appendChild(messageEl);
    toast.appendChild(closeBtn);
    
    // Add to container with animation
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';
    this.container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }
    
    return toast;
  }

  remove(toast) {
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  getTypeClasses(type) {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  }

  getIcon(type) {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Initialize global toast instance
const toast = new Toast();

// Export to global scope
window.Toast = Toast;
window.toast = toast;

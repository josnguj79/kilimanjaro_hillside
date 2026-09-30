// Dynamic CSS Toast Notification Function
function showToast(message, type = 'success') {
    // Check if toast container exists; if not, create it
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 transform translate-y-5 opacity-0 ${
        type === 'success' 
            ? 'bg-brand-green text-white border-brand-gold/40' 
            : 'bg-stone-900 text-white border-stone-700'
    }`;

    // Icon based on type
    const iconClass = type === 'success' ? 'fa-solid fa-circle-check text-brand-gold text-lg' : 'fa-solid fa-circle-info text-brand-gold text-lg';

    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <div class="flex-grow leading-snug">${message}</div>
        <button onclick="this.parentElement.remove()" class="text-stone-400 hover:text-white transition-colors ml-2">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    // Trigger animation in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
    });

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-5', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Header Scroll Shadow Effect
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (window.scrollY > 50) {
        header.classList.add('header-scrolled');
    } else {
        header.classList.remove('header-scrolled');
    }
});

// Mobile Navigation Toggle
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLinks = document.querySelectorAll('.mobile-link');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });
});

// Gallery Filter Functionality
function filterGallery(category) {
    const items = document.querySelectorAll('.gallery-item');
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');

    filterBtns.forEach(btn => {
        if (btn.getAttribute('data-filter') === category) {
            btn.classList.add('active-filter');
            btn.classList.remove('text-stone-600');
        } else {
            btn.classList.remove('active-filter');
            btn.classList.add('text-stone-600');
        }
    });

    items.forEach(item => {
        if (category === 'all' || item.classList.contains(category)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Lightbox Modal Functions
function openLightbox(imgSrc, caption) {
    const lightbox = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');

    lightboxImg.src = imgSrc;
    lightboxCaption.textContent = caption;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
}

function closeLightbox(e) {
    const lightbox = document.getElementById('lightbox-modal');
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
}

// Booking Modal Functions
function openBookingModal(suiteName = '') {
    const modal = document.getElementById('booking-modal');
    const select = document.getElementById('modal-suite-select');

    if (suiteName && select) {
        select.value = suiteName;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Form Handlers (Replaced browser alerts with CSS toasts)
function handleQuickBook(event) {
    event.preventDefault();
    openBookingModal();
}

function handleModalSubmit(event) {
    event.preventDefault();
    closeBookingModal();
    showToast('Thank you! Your reservation request has been received. Our concierge will confirm your stay shortly.');
    event.target.reset();
}

function handleContactSubmit(event) {
    event.preventDefault();
    showToast('Message sent! We have received your inquiry and will reply within 24 hours.');
    event.target.reset();
}

function handleSubscribe(event) {
    event.preventDefault();
    showToast('Welcome to our newsletter! You will receive exclusive stay packages and safari updates.');
    event.target.reset();
}
// Testimonial Carousel Script
let currentTestimonialIndex = 0;
let testimonialInterval;

function showTestimonial(index) {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('#testimonial-dots button');

    if (slides.length === 0) return;

    // Wrap-around index checking
    if (index >= slides.length) currentTestimonialIndex = 0;
    else if (index < 0) currentTestimonialIndex = slides.length - 1;
    else currentTestimonialIndex = index;

    // Hide all slides
    slides.forEach((slide, i) => {
        if (i === currentTestimonialIndex) {
            slide.classList.remove('hidden');
            setTimeout(() => {
                slide.classList.remove('opacity-0');
                slide.classList.add('opacity-100');
            }, 50);
        } else {
            slide.classList.add('opacity-0');
            slide.classList.remove('opacity-100');
            slide.classList.add('hidden');
        }
    });

    // Update indicator dots
    dots.forEach((dot, i) => {
        if (i === currentTestimonialIndex) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-brand-gold transition-all';
        } else {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-stone-600 hover:bg-stone-400 transition-all';
        }
    });
}

function nextTestimonial() {
    showTestimonial(currentTestimonialIndex + 1);
    resetTestimonialTimer();
}

function prevTestimonial() {
    showTestimonial(currentTestimonialIndex - 1);
    resetTestimonialTimer();
}

function goToTestimonial(index) {
    showTestimonial(index);
    resetTestimonialTimer();
}

// Auto-rotate every 6 seconds
function startTestimonialTimer() {
    testimonialInterval = setInterval(() => {
        showTestimonial(currentTestimonialIndex + 1);
    }, 6000);
}

function resetTestimonialTimer() {
    clearInterval(testimonialInterval);
    startTestimonialTimer();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    startTestimonialTimer();
});
// Back to Top Scroll Logic
const backToTopBtn = document.getElementById('back-to-top-btn');

window.addEventListener('scroll', () => {
    if (!backToTopBtn) return;

    if (window.scrollY > 250) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
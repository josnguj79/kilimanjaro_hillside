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

async function handleModalSubmit(event) {
    event.preventDefault();

    const form = event.target;
    
    // Target inputs precisely using DOM traversal relative to form structure
    const suiteSelect = form.querySelector('#modal-suite-select');
    const dateInputs = form.querySelectorAll('input[type="date"]'); // [0] = Check In, [1] = Check Out
    const nameInput = form.querySelector('input[type="text"]');
    const emailInput = form.querySelector('input[type="email"]');

    // Build payload matching your Express /api/inquire endpoint expectations
    const payload = {
        name: nameInput?.value.trim(),
        email: emailInput?.value.trim(),
        suite: suiteSelect?.value || 'General Inquiry',
        check_in: dateInputs[0]?.value || null, // Check In Date
        message: dateInputs[1]?.value ? `Check Out Date: ${dateInputs[1].value}` : '' // Optional message
    };

    // UI Loading State
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'Confirm Reservation Request';
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'PROCESSING REQUEST...';
        submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    }

    try {
        // Live Render Backend API (Handles Turso storage + WhatsApp alert server-side)
        const response = await fetch('https://kilimanjaro-hillside.onrender.com/api/inquire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            closeBookingModal();
            showToast('Thank you! Your reservation request has been received. Our concierge will confirm your stay shortly.');
            form.reset();
        } else {
            showToast(`Submission Error: ${data.error || 'Failed to submit.'}`, 'error');
        }
    } catch (error) {
        console.error('API Error:', error);
        showToast('Unable to connect to reservation service. Please check your internet connection and try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}
async function handleContactSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('contact-submit-btn');

    // Extract form data
    const payload = {
        full_name: document.getElementById('contact-name').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        inquiry_type: document.getElementById('contact-inquiry-type').value,
        message: document.getElementById('contact-message').value.trim()
    };

    // Prevent submit spam & show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }

    try {
        const response = await fetch('https://kilimanjaro-hillside.onrender.com/api/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Message sent! We have received your inquiry and will reply within 24 hours.');
            form.reset();
        } else {
            showToast(result.error || 'Failed to send message. Please try again.');
        }
    } catch (error) {
        console.error('Contact Form Error:', error);
        showToast('Network error. Please check your connection and try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    }
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

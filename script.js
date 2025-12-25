// Your JavaScript code here

document.addEventListener('DOMContentLoaded', function() {
    // Load brands carousel
    loadBrands();
    
    // Hamburger menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const headerWrapper = document.querySelector('.header-wrapper');
    
    function updateMenuPosition() {
        if (!navMenu || !headerWrapper) return;
        
        // Only set top position on mobile screens
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Get the exact bottom position of the header wrapper (includes header + announcement)
            const headerRect = headerWrapper.getBoundingClientRect();
            const headerBottom = headerRect.bottom;
            
            // Position menu exactly at the bottom of header wrapper with no gap
            navMenu.style.top = headerBottom + 'px';
        } else {
            // Remove top style on desktop
            navMenu.style.top = '';
        }
    }
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            updateMenuPosition();
        });

        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInside = event.target.closest('.main-nav');
            if (!isClickInside && navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
        
        // Update position on resize or when announcement visibility changes
        window.addEventListener('resize', updateMenuPosition, { passive: true });
        
        // Observe announcement visibility changes
        const announcement = document.getElementById('announcement-banner');
        if (announcement) {
            const observer = new MutationObserver(updateMenuPosition);
            observer.observe(announcement, { attributes: true, attributeFilter: ['style'] });
        }
        
        // Initial position update
        updateMenuPosition();
    }
    
    // Instagram deep link handler with fallback
    const instagramLinks = document.querySelectorAll('.instagram-link');
    instagramLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const fallbackUrl = this.getAttribute('data-fallback');
            if (!fallbackUrl) return;
            
            // Try to open Instagram app
            const appUrl = this.getAttribute('href');
            
            // Check if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                e.preventDefault();
                
                // Try to open the app
                window.location.href = appUrl;
                
                // Set a timeout to check if app opened
                // If the app opened, the page will lose focus or navigate away
                // If it didn't open, we fall back to web version
                let appOpened = false;
                const timeout = setTimeout(() => {
                    if (!appOpened) {
                        // App didn't open, use fallback
                        window.open(fallbackUrl, '_blank');
                    }
                }, 500);
                
                // Detect if app opened by checking if page loses focus
                const handleBlur = () => {
                    appOpened = true;
                    clearTimeout(timeout);
                    window.removeEventListener('blur', handleBlur);
                };
                
                window.addEventListener('blur', handleBlur);
                
                // Also clear timeout if page visibility changes
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        appOpened = true;
                        clearTimeout(timeout);
                    }
                });
            } else {
                // On desktop, just open web version in new tab
                e.preventDefault();
                window.open(fallbackUrl, '_blank');
            }
        });
    });
});

// Load brands from JSON and render carousel
function loadBrands() {
    const carousel = document.getElementById('brands-carousel');
    if (!carousel) return;
    
    fetch('content/brands.json')
        .then(response => response.json())
        .then(data => {
            const brands = data.brands || [];
            
            if (brands.length === 0) {
                carousel.innerHTML = '<p>Brands coming soon...</p>';
                return;
            }
            
            // Render single brand item HTML
            const html = brands.map(brand => {
                // Use the logo path directly from CMS
                let imagePath = brand.logo;
                // Remove leading slash if present (CMS sometimes adds it)
                if (imagePath.startsWith('/')) {
                    imagePath = imagePath.substring(1);
                }
                // Convert Netlify path (img/uploads) to local path (static/img/uploads)
                if (imagePath.startsWith('img/uploads/')) {
                    imagePath = imagePath.replace('img/uploads/', 'static/img/uploads/');
                }
                
                return `
                    <div class="brand-item">
                        <img src="${encodeURI(imagePath)}" alt="${brand.name}">
                    </div>
                `;
            }).join('');
            
            // Clone enough times to ensure seamless infinite loop
            // We need at least 3 clones (1 original + 2 duplicates) for seamless effect
            const numClones = 3;
            
            // Duplicate the HTML multiple times for seamless infinite scrolling
            carousel.innerHTML = html.repeat(numClones);
            
            // Wait for images to load, then calculate actual widths
            const images = carousel.querySelectorAll('.brand-item img');
            let loadedImages = 0;
            
            const initializeAnimation = () => {
                // Calculate actual width of one complete set of brands
                const firstSetElements = Array.from(carousel.querySelectorAll('.brand-item')).slice(0, brands.length);
                let setWidth = 0;
                
                firstSetElements.forEach((item, index) => {
                    const itemWidth = item.offsetWidth;
                    // Add gap (3rem = 48px on desktop, 2rem = 32px on mobile)
                    const gap = window.innerWidth < 768 ? 32 : 48;
                    setWidth += itemWidth + (index < firstSetElements.length - 1 ? gap : 0);
                });
                
                // Calculate animation duration - proportional to the scroll distance
                // Ensures consistent scroll speed regardless of number of brands
                // Base speed: 50px per second
                const pixelsPerSecond = 50;
                const duration = Math.max(20, setWidth / pixelsPerSecond);
                
                // Set CSS custom properties
                carousel.style.setProperty('--scroll-duration', `${duration}s`);
                carousel.style.setProperty('--scroll-distance', `-${setWidth}px`);
            };
            
            if (images.length === 0) {
                // No images, initialize immediately
                initializeAnimation();
            } else {
                // Wait for all images to load
                images.forEach(img => {
                    if (img.complete) {
                        loadedImages++;
                        if (loadedImages === images.length) {
                            setTimeout(initializeAnimation, 100);
                        }
                    } else {
                        img.addEventListener('load', () => {
                            loadedImages++;
                            if (loadedImages === images.length) {
                                setTimeout(initializeAnimation, 100);
                            }
                        });
                    }
                });
            }
            
            // Recalculate on window resize
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(initializeAnimation, 250);
            });
        })
        .catch(error => {
            console.error('Error loading brands:', error);
            // Fallback: show error message
            carousel.innerHTML = '<p>Brands coming soon...</p>';
        });
}

// Load reviews from JSON and render carousel (simplified - show 3 cards)
function loadReviews() {
    const carousel = document.getElementById('reviews-carousel');
    if (!carousel) return;
    
    fetch('content/reviews.json')
        .then(response => {
            if (!response.ok) {
                carousel.innerHTML = '<p style="text-align: center; color: var(--color-text); padding: 2rem;">Reviews worden binnenkort toegevoegd...</p>';
                return;
            }
            return response.json();
        })
        .then(data => {
            const reviews = data.reviews || [];
            
            if (reviews.length === 0) {
                carousel.innerHTML = '<p style="text-align: center; color: var(--color-text); padding: 2rem;">Reviews worden binnenkort toegevoegd...</p>';
                return;
            }
            
            // Sort reviews: 5-star reviews first
            const sortedReviews = [...reviews].sort((a, b) => {
                return (b.rating || 5) - (a.rating || 5);
            });
            
            // Show only first 3 reviews
            const displayReviews = sortedReviews.slice(0, 3);
            
            const html = displayReviews.map(review => {
                const initials = review.author ? review.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
                const rating = review.rating || 5;
                const stars = Array.from({ length: 5 }, (_, i) => {
                    if (i < rating) {
                        return '<i data-lucide="star" class="star-icon star-filled"></i>';
                    } else {
                        return '<i data-lucide="star" class="star-icon star-empty"></i>';
                    }
                }).join('');
                
                return `
                    <div class="review-card">
                        <div class="review-header">
                            <div class="review-avatar">${initials}</div>
                            <div class="review-author">
                                <div class="review-author-name">${review.author || 'Anoniem'}</div>
                                <div class="review-stars">${stars}</div>
                            </div>
                        </div>
                        <div class="review-text">${review.text || ''}</div>
                        <div class="review-date">${review.date || ''}</div>
                    </div>
                `;
            }).join('');
            
            carousel.innerHTML = html;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // Initialize carousel navigation after content is loaded
            setTimeout(() => {
                initReviewsCarousel();
            }, 100);
        })
        .catch(error => {
            console.error('Error loading reviews:', error);
            carousel.innerHTML = '<p style="text-align: center; color: var(--color-text); padding: 2rem;">Reviews worden binnenkort toegevoegd...</p>';
        });
}

// Initialize reviews carousel navigation
function initReviewsCarousel() {
    const carousel = document.getElementById('reviews-carousel');
    const leftArrow = document.getElementById('reviews-arrow-left');
    const rightArrow = document.getElementById('reviews-arrow-right');
    
    if (!carousel || !leftArrow || !rightArrow) return;
    
    const cards = carousel.querySelectorAll('.review-card');
    if (cards.length === 0) return;
    
    // Function to scroll to a card by index
    function scrollToCard(index) {
        if (index < 0 || index >= cards.length) return;
        
        const card = cards[index];
        const carouselRect = carousel.getBoundingClientRect();
        const containerWidth = carouselRect.width;
        
        let finalPosition;
        
        if (index === 0) {
            // First card: scroll to position 0
            finalPosition = 0;
        } else {
            // Other cards: center them in the viewport
            const cardRect = card.getBoundingClientRect();
            const cardWidth = cardRect.width;
            const cardLeft = cardRect.left - carouselRect.left + carousel.scrollLeft;
            const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
            
            // Clamp to valid range
            const maxScroll = carousel.scrollWidth - carousel.clientWidth;
            finalPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
        }
        
        carousel.scrollTo({
            left: finalPosition,
            behavior: 'smooth'
        });
    }
    
    // Find current card index
    function getCurrentCardIndex() {
        let currentIndex = 0;
        let minDistance = Infinity;
        const carouselRect = carousel.getBoundingClientRect();
        const viewportCenter = carouselRect.left + carouselRect.width / 2;
        
        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const distance = Math.abs(viewportCenter - cardCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                currentIndex = index;
            }
        });
        
        return currentIndex;
    }
    
    // Initialize: Scroll to first card (position 0) on load
    // This ensures we start at the first card, not the centered middle card
    function resetToFirstCard() {
        carousel.scrollLeft = 0;
    }
    
    // Reset immediately and after a short delay to ensure it sticks
    resetToFirstCard();
    setTimeout(resetToFirstCard, 50);
    setTimeout(resetToFirstCard, 200);
    setTimeout(resetToFirstCard, 500);
    
    // Also reset on resize
    window.addEventListener('resize', () => {
        setTimeout(resetToFirstCard, 100);
    });
    
    // Arrow click handlers
    leftArrow.addEventListener('click', () => {
        const currentIndex = getCurrentCardIndex();
        const prevIndex = Math.max(0, currentIndex - 1);
        scrollToCard(prevIndex);
    });
    
    rightArrow.addEventListener('click', () => {
        const currentIndex = getCurrentCardIndex();
        const nextIndex = Math.min(cards.length - 1, currentIndex + 1);
        scrollToCard(nextIndex);
    });
    
    // Hide arrows if all cards fit
    function updateArrowVisibility() {
        const needsScroll = carousel.scrollWidth > carousel.clientWidth;
        if (needsScroll) {
            leftArrow.style.display = 'flex';
            rightArrow.style.display = 'flex';
        } else {
            leftArrow.style.display = 'none';
            rightArrow.style.display = 'none';
        }
    }
    
    updateArrowVisibility();
    window.addEventListener('resize', updateArrowVisibility);
}

// Modal functionality - Privacy and Algemene Voorwaarden
function initModal() {
    const privacyModal = document.getElementById('privacy-modal');
    const modalContent = document.getElementById('privacy-content');
    if (!privacyModal || !modalContent) return;
    
    const closeBtn = privacyModal.querySelector('.modal-close');
    
    // Privacy content
    const privacyContent = `
        <h2>Privacy</h2>
        
        <h3>1. Doel van de website</h3>
        <p>Onze website is uitsluitend bedoeld om informatie te delen over onze fysieke winkel en producten. Er is geen online verkoop van producten via deze site.</p>
        
        <h3>2. Privacy</h3>
        <p>Wij respecteren jouw privacy.</p>
        <ul>
            <li>We verzamelen geen persoonsgegevens via deze website, behalve wanneer je gebruikmaakt van specifieke functionaliteiten zoals cadeaubonnen.</li>
            <li>Voor statistieken gebruiken we Umami, een cookieloos systeem dat geen persoonlijke data opslaat.</li>
            <li>We plaatsen geen trackingcookies en gebruiken geen advertentienetwerken.</li>
        </ul>
        
        <h3>3. Cadeaubonnen (binnenkort beschikbaar)</h3>
        <p>Wanneer je een cadeaubon koopt via onze website, verwerken wij persoonsgegevens om de bestelling correct uit te voeren.</p>
        
        <p><strong>Welke gegevens verzamelen we?</strong></p>
        <ul>
            <li>Naam en e-mailadres van de koper</li>
            <li>Naam en e-mailadres van de ontvanger</li>
            <li>Betaalgegevens (via Gift Up en de gekoppelde betaalprovider)</li>
        </ul>
        
        <p><strong>Waarom verzamelen we deze gegevens?</strong></p>
        <ul>
            <li>Om de cadeaubon digitaal te kunnen leveren</li>
            <li>Om contact op te nemen bij vragen of problemen met de bestelling</li>
        </ul>
        
        <p><strong>Wie heeft toegang tot deze gegevens?</strong></p>
        <ul>
            <li>Oriento (voor administratieve doeleinden)</li>
            <li>Gift Up (als verwerker, conform hun privacybeleid)</li>
        </ul>
        
        <p><strong>Bewaartermijn:</strong></p>
        <p>Gegevens worden bewaard zolang nodig is voor de uitvoering van de bestelling en wettelijke verplichtingen (bijvoorbeeld boekhouding).</p>
        
        <p><strong>Jouw rechten:</strong></p>
        <p>Je hebt het recht op inzage, correctie en verwijdering van jouw gegevens.<br>Neem contact op via <a href="mailto:oriento@skynet.be">oriento@skynet.be</a> voor vragen of verzoeken.</p>
        
        <h3>4. Externe diensten</h3>
        <p>Onze website kan links bevatten naar externe websites of diensten. Wij zijn niet verantwoordelijk voor de privacypraktijken van deze externe partijen.</p>
        
        <h3>5. GDPR</h3>
        <p>Wij verwerken persoonsgegevens conform de Algemene Verordening Gegevensbescherming (AVG/GDPR). Voor klachten kun je terecht bij de Gegevensbeschermingsautoriteit (<a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank">www.gegevensbeschermingsautoriteit.be</a>).</p>
    `;
    
    // Algemene Voorwaarden content
    const algemeneVoorwaardenContent = `
        <h2>Algemene Voorwaarden</h2>
        <p><strong>Versie: november 2025</strong></p>
        <p>Welkom op de website van Oriento (www.oriento.net). Door deze website te gebruiken, ga je akkoord met deze voorwaarden.</p>
        
        <h3>1. Doel van de website</h3>
        <p>Onze website is uitsluitend bedoeld om informatie en sfeerbeelden te delen over onze fysieke winkel en collectie. Er is geen online verkoop van producten via deze site.</p>
        
        <h3>2. Inhoud en rechten</h3>
        <p>De afbeeldingen en teksten op deze website zijn uitsluitend bedoeld ter illustratie. Wij claimen geen rechten op materiaal dat afkomstig is van externe bronnen of leveranciers. Het gebruik van deze website geeft geen rechten op de inhoud.</p>
        
        <h3>3. Juistheid van informatie</h3>
        <p>Wij doen ons best om correcte en actuele informatie te tonen, maar kunnen niet garanderen dat alle informatie volledig of foutloos is.</p>
        
        <h3>4. Cadeaubonnen (toekomstige functionaliteit)</h3>
        <p>Binnenkort bieden wij cadeaubonnen aan via een externe dienst (Gift Up).</p>
        <ul>
            <li>Cadeaubonnen worden digitaal geleverd via e-mail.</li>
            <li>De waarde en geldigheid van de cadeaubon worden duidelijk vermeld bij aankoop.</li>
            <li>Cadeaubonnen zijn niet inwisselbaar voor contant geld.</li>
            <li>Het herroepingsrecht geldt tot 14 dagen na aankoop, tenzij de cadeaubon al is gebruikt.</li>
            <li>Voor de verwerking van persoonsgegevens (naam, e-mailadres) verwijzen wij naar ons Privacybeleid.</li>
        </ul>
        
        <h3>5. Externe links</h3>
        <p>Onze website kan links bevatten naar externe websites. Wij zijn niet verantwoordelijk voor de inhoud of privacypraktijken van deze externe sites.</p>
        
        <h3>6. Wijzigingen</h3>
        <p>Wij behouden ons het recht voor om deze voorwaarden op elk moment te wijzigen. De meest recente versie is altijd beschikbaar op deze website.</p>
        
        <h3>7. Toepasselijk recht</h3>
        <p>Op deze voorwaarden is het Belgische recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechtbanken in België.</p>
    `;
    
    // Modal trigger logic
    document.querySelectorAll('.footer-link, .footer-bottom-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const modalType = this.getAttribute('data-modal');
            
            if (modalType === 'privacy') {
                modalContent.innerHTML = privacyContent;
                
                // Use flex for mobile bottom sheet, block for desktop
                const isMobile = window.innerWidth <= 768;
                privacyModal.style.display = isMobile ? 'flex' : 'block';
                // force reflow before adding class to ensure transition
                // eslint-disable-next-line no-unused-expressions
                privacyModal.offsetHeight;
                privacyModal.classList.add('show');
            } else if (modalType === 'algemene-voorwaarden') {
                modalContent.innerHTML = algemeneVoorwaardenContent;
                
                // Use flex for mobile bottom sheet, block for desktop
                const isMobile = window.innerWidth <= 768;
                privacyModal.style.display = isMobile ? 'flex' : 'block';
                // force reflow before adding class to ensure transition
                // eslint-disable-next-line no-unused-expressions
                privacyModal.offsetHeight;
                privacyModal.classList.add('show');
            }
        });
    });

    // Close modal
    function closeModal() {
        privacyModal.classList.remove('show');
        // wait for transition to finish before hiding
        setTimeout(() => {
            privacyModal.style.display = 'none';
        }, 300);
    }

    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === privacyModal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && privacyModal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // Handle modal repositioning on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only update if modal is currently open
            if (privacyModal.classList.contains('show')) {
                const isMobile = window.innerWidth <= 768;
                privacyModal.style.display = isMobile ? 'flex' : 'block';
            }
        }, 50);
    });
}

// Initialize scroll fade-in animations for gallery
function initScrollAnimations() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    if (galleryItems.length === 0) return;
    
    // Create Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stop observing once visible to improve performance
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% of item is visible
        rootMargin: '0px 0px -50px 0px' // Start animation slightly before item enters viewport
    });
    
    // Observe all gallery items
    galleryItems.forEach((item) => {
        observer.observe(item);
    });
}

// Load products from JSON and render them
function loadProducts() {
    fetch('content/products.json')
        .then(response => {
            if (!response.ok) {
                console.log('Products file not found, using static content');
                initProductScrollAnimations();
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            
            // Support multiple schema formats for backward compatibility:
            // 1. New simplified: data.juwelen = [{ image, alt, new, cadeautip }, ...] (direct array)
            // 2. Intermediate: data.juwelen.items = [{ image, alt, new, cadeautip }, ...]
            // 3. Old: data.juwelen.subcategories = [{ subcategory, items: [...] }, ...]
            const categoryMap = {};
            const categories = ['juwelen', 'accessoires', 'wonen'];
            
            categories.forEach(cat => {
                if (!data[cat]) return;
                
                let items = [];
                
                // Check if category is directly an array (new simplified structure)
                if (Array.isArray(data[cat])) {
                    items = data[cat];
                }
                // Check for items property (intermediate structure)
                else if (Array.isArray(data[cat].items)) {
                    items = data[cat].items;
                }
                // Fall back to old structure: items nested in subcategories
                else if (Array.isArray(data[cat].subcategories)) {
                    data[cat].subcategories.forEach(entry => {
                        if (entry && Array.isArray(entry.items)) {
                            items = items.concat(entry.items);
                        }
                    });
                }
                
                categoryMap[cat] = items.map(item => ({
                    category: cat,
                    image: item.image,
                    alt: item.alt,
                    brand: item.brand,
                    new: !!item.new,
                    cadeautip: !!item.cadeautip
                }));
            });
            
            const hasAny = Object.keys(categoryMap).some(cat => categoryMap[cat].length > 0);
            if (!hasAny) {
                initProductScrollAnimations();
                initProductModal();
                return;
            }

            // Ensure category sections exist in HTML (they should already be there)
            const collectionMain = document.querySelector('.collection-main');
            if (!collectionMain) return;
            
            // Render products in their respective category sections
            Object.keys(categoryMap).forEach(category => {
                const section = document.getElementById(category);
                if (!section) return;
                
                // Find or create product grid in this section
                let grid = section.querySelector('.product-grid');
                if (!grid) {
                    grid = document.createElement('div');
                    grid.className = 'product-grid';
                    section.appendChild(grid);
                }

                const html = categoryMap[category].map(product => {
                    // Normalize image path like in loadBrands
                    let imagePath = product.image || '';
                    if (imagePath.startsWith('/')) imagePath = imagePath.substring(1);
                    if (imagePath.startsWith('img/uploads/')) {
                        imagePath = imagePath.replace('img/uploads/', 'static/img/uploads/');
                    }
                    const newBadge = product.new ? '<span class="product-new-badge">NEW</span>' : '';
                    const cadeautipBadge = product.cadeautip ? '<span class="product-cadeautip-badge">CADEAUTIP</span>' : '';
                    return `
                        <div class="product-item" data-image="${encodeURI(imagePath)}" data-alt="${product.alt || ''}" data-brand="${(product.alt || '').replace(/"/g, '&quot;')}" data-new="${product.new ? 'true' : 'false'}" data-cadeautip="${product.cadeautip ? 'true' : 'false'}">
                            <img src="${encodeURI(imagePath)}" alt="${product.alt || 'Product'}">
                            ${newBadge}
                            ${cadeautipBadge}
                        </div>
                    `;
                }).join('');
                grid.innerHTML = html;
            });
            
            // Initialize icons for category links if not already initialized
            setTimeout(() => {
                lucide.createIcons();
                initProductScrollAnimations();
                initProductModal();
            }, 100);
        })
        .catch(error => {
            console.error('Error loading products:', error);
            // Fallback: use static content
            initProductScrollAnimations();
            initProductModal();
        });
}

// Helper to prettify labels from keys (e.g., handtassen -> Handtassen, kussens-plaids -> Kussens en Plaids)
function formatLabel(key) {
    return key
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Initialize scroll animations for product items
function initProductScrollAnimations() {
    const productItems = document.querySelectorAll('.product-item');
    
    if (productItems.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    productItems.forEach(item => {
        observer.observe(item);
    });
}

// Product detail modal
function initProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    const closeBtn = document.getElementById('product-modal-close');
    const closeLinkBtn = document.getElementById('product-modal-close-btn');
    const imgEl = document.getElementById('product-modal-image');
    const brandEl = document.getElementById('product-modal-brand');
    const badgesEl = document.getElementById('product-modal-badges');
    const items = document.querySelectorAll('.product-item');
    
    function open() {
        const isMobile = window.innerWidth <= 768;
        modal.style.display = isMobile ? 'flex' : 'block';
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        modal.offsetHeight;
        modal.classList.add('show');
    }
    
    function close() {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    items.forEach(item => {
        item.addEventListener('click', async () => {
            // Track product click in Umami
            if (typeof umami !== 'undefined') {
                const brand = item.querySelector('img')?.getAttribute('alt') || 'Product';
                umami.track('Product Click', { brand: brand });
            }
            
            // Always derive from clicked card image to prevent stale data
            const cardImg = item.querySelector('img');
            const image = cardImg ? (cardImg.getAttribute('src') || '') : '';
            const alt = cardImg ? (cardImg.getAttribute('alt') || 'Product') : 'Product';
            const brand = alt; // CMS brand stored as alt

            const isNew = !!item.querySelector('.product-new-badge');
            const isCadeautip = !!item.querySelector('.product-cadeautip-badge');

            if (imgEl) {
                // Prevent showing previous image while switching
                imgEl.style.visibility = 'hidden';
                // Cancel previous listeners
                imgEl.onload = null;
                imgEl.onerror = null;
                imgEl.alt = alt;
                imgEl.src = image;
            }
            if (brandEl) {
                brandEl.textContent = brand || 'Product';
            }
            if (badgesEl) {
                badgesEl.innerHTML = `${isNew ? '<span class="product-new-badge">NEW</span>' : ''}${isCadeautip ? '<span class="product-cadeautip-badge">CADEAUTIP</span>' : ''}`;
            }
            // Open modal only once image is ready to prevent brief old-image flash
            const reveal = () => {
                if (imgEl) imgEl.style.visibility = '';
                open();
            };

            if (imgEl && typeof imgEl.decode === 'function') {
                try {
                    await imgEl.decode();
                    reveal();
                } catch (e) {
                    // Fallback to onload if decode fails
                    imgEl.onload = reveal;
                    imgEl.onerror = reveal;
                }
            } else {
                if (imgEl) {
                    imgEl.onload = reveal;
                    imgEl.onerror = reveal;
                } else {
                    open();
                }
            }
        });
    });
    
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (closeLinkBtn) closeLinkBtn.addEventListener('click', close);
    window.addEventListener('click', function(e) {
        if (e.target === modal) close();
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            close();
        }
    });
    
    // Handle modal repositioning on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only update if modal is currently open
            if (modal.classList.contains('show')) {
                const isMobile = window.innerWidth <= 768;
                modal.style.display = isMobile ? 'flex' : 'block';
            }
        }, 50);
    });
}

// Load and display announcements
function loadAnnouncements() {
    const banner = document.getElementById('announcement-banner');
    const textElement = document.getElementById('announcement-text');
    const closeBtn = document.getElementById('announcement-close');
    const heroSection = document.querySelector('.hero-section');
    const siteHeader = document.querySelector('.site-header');
    
    if (!banner || !textElement) return;
    
    // Try to load from local development first, then production
    const announcementsPath = 'content/announcements.json';
    
    fetch(announcementsPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Announcements file not found');
            }
            return response.json();
        })
        .then(data => {
            // Check if announcements exist
            if (!data.announcements || data.announcements.length === 0) {
                return;
            }
            
            // Get active announcements
            const activeAnnouncements = data.announcements.filter(ann => ann.active);
            
            if (activeAnnouncements.length === 0) {
                return;
            }
            
            // Convert markdown to HTML for rich text formatting
            function markdownToHtml(text) {
                if (!text) return '';
                // Check if already HTML (contains tags)
                if (text.includes('<')) {
                    return text;
                }
                // Convert markdown syntax to HTML
                return text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold **text**
                    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic *text*
                    .replace(/__(.*?)__/g, '<strong>$1</strong>') // Bold __text__
                    .replace(/_(.*?)_/g, '<em>$1</em>') // Italic _text_
                    .replace(/~~(.*?)~~/g, '<del>$1</del>') // Strikethrough ~~text~~
                    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>') // Underline (if using HTML)
                    .replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code `text`
            }
            
            // Get the header wrapper - it should contain the original announcement banner
            const headerWrapper = document.querySelector('.header-wrapper');
            if (!headerWrapper) {
                console.warn('Header wrapper not found, cannot display announcements');
                return;
            }
            
            // Clear any existing dynamically created banners (keep the original one for fallback)
            const existingBanners = document.querySelectorAll('.announcement-banner[data-announcement-index]');
            existingBanners.forEach(b => b.remove());
            
            // Track if we successfully created any banners
            let bannersCreated = 0;
            
            // Create a banner for each active announcement
            activeAnnouncements.forEach((announcement, index) => {
                if (!announcement || !announcement.text) return;
                
                const announcementText = announcement.text.replace(/\n/g, ' ').trim();
                if (!announcementText) return;
                
                try {
                    // Create a content hash based on the announcement text to detect changes
                    // Use encodeURIComponent to handle Unicode characters before btoa
                    const contentHash = btoa(encodeURIComponent(announcementText)).substring(0, 16);
                    
                    // Check if this specific announcement was dismissed in this session
                    let dismissedHashes = [];
                    try {
                        dismissedHashes = JSON.parse(sessionStorage.getItem('announcement-dismissed-hashes') || '[]');
                    } catch (e) {
                        // If sessionStorage is corrupted, reset it
                        sessionStorage.removeItem('announcement-dismissed-hashes');
                    }
                    
                    if (dismissedHashes.includes(contentHash)) {
                        // This announcement was already dismissed, skip it
                        return;
                    }
                    
                    // Create a new banner element for this announcement
                    const newBanner = document.createElement('div');
                    newBanner.className = 'announcement-banner';
                    newBanner.setAttribute('data-announcement-index', index);
                    newBanner.setAttribute('data-content-hash', contentHash);
                    newBanner.style.display = 'block';
                    
                    // Escape HTML in the text before inserting (markdownToHtml handles formatting)
                    const safeHtml = markdownToHtml(announcementText);
                    
                    newBanner.innerHTML = `
                        <div class="announcement-content">
                            <i data-lucide="alert-triangle" class="announcement-icon"></i>
                            <div class="announcement-text">${safeHtml}</div>
                            <button class="icon-button announcement-close" aria-label="Close announcement" data-umami-event="Close Announcement" data-content-hash="${contentHash}">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    `;
                    
                    // Insert before header wrapper (so banners appear at the top)
                    if (headerWrapper.parentNode) {
                        headerWrapper.parentNode.insertBefore(newBanner, headerWrapper);
                        bannersCreated++;
                    }
                    
                    // Set up close button listener
                    const closeBtn = newBanner.querySelector('.announcement-close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', function() {
                            try {
                                // Mark this announcement as dismissed
                                let dismissedHashes = [];
                                try {
                                    dismissedHashes = JSON.parse(sessionStorage.getItem('announcement-dismissed-hashes') || '[]');
                                } catch (e) {
                                    dismissedHashes = [];
                                }
                                
                                if (!dismissedHashes.includes(contentHash)) {
                                    dismissedHashes.push(contentHash);
                                    sessionStorage.setItem('announcement-dismissed-hashes', JSON.stringify(dismissedHashes));
                                }
                                
                                // Remove this banner
                                newBanner.remove();
                                
                                // Re-initialize icons
                                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                                    lucide.createIcons();
                                }
                            } catch (error) {
                                console.error('Error closing announcement:', error);
                                // Fallback: just remove the banner
                                newBanner.remove();
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error creating announcement banner:', error, announcement);
                    // Continue with next announcement even if this one fails
                }
            });
            
            // Hide the original banner (we're using dynamically created ones)
            if (banner) {
                banner.style.display = 'none';
            }
            
            // Initialize Lucide icons for all new banners
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
            
            // If no banners were created, ensure the original is hidden
            if (bannersCreated === 0 && banner) {
                banner.style.display = 'none';
            }
        })
        .catch(error => {
            console.log('Announcements not available:', error);
        });
}

// Initialize scroll progress bar and sticky header
function initScrollProgress() {
    const header = document.querySelector('.site-header');
    const headerWrapper = document.querySelector('.header-wrapper');
    if (!header || !headerWrapper) return;
    
    let headerWrapperHeight = headerWrapper.offsetHeight;
    let headerTop = headerWrapper.offsetTop;
    const heroSection = document.querySelector('.hero-section');
    
    // Find the first main content element (skip buttons, overlays, etc.)
    function findMainContent() {
        if (heroSection) return null; // Don't need it if hero exists
        let next = headerWrapper.nextElementSibling;
        while (next) {
            // Skip buttons, overlays, and other utility elements
            if (!next.classList.contains('sidebar-toggle-mobile') && 
                !next.classList.contains('sidebar-overlay') &&
                next.tagName !== 'BUTTON') {
                return next;
            }
            next = next.nextElementSibling;
        }
        return null;
    }
    
    const mainContent = findMainContent();
    
    // Function to update header height
    function updateHeaderHeight() {
        headerWrapperHeight = headerWrapper.offsetHeight;
        headerTop = headerWrapper.offsetTop;
        
        // Add spacer to prevent content jump when header becomes sticky
        if (headerWrapper.classList.contains('is-sticky')) {
            if (heroSection) {
                // For pages with hero section, add margin to hero
                heroSection.style.marginTop = headerWrapperHeight + 'px';
            } else if (mainContent) {
                // For pages without hero section, add padding to first content element
                mainContent.style.paddingTop = headerWrapperHeight + 'px';
            }
        } else {
            // Remove spacers when not sticky
            if (heroSection) {
                heroSection.style.marginTop = '';
            }
            if (mainContent) {
                mainContent.style.paddingTop = '';
            }
        }
    }
    
    // Recalculate on resize
    window.addEventListener('resize', function() {
        updateHeaderHeight();
    }, { passive: true });
    
    function updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Make header wrapper (with announcement and header) sticky when scrolled past it
        const wasSticky = headerWrapper.classList.contains('is-sticky');
        if (scrollTop > headerTop) {
            if (!wasSticky) {
                headerWrapper.classList.add('is-sticky');
                updateHeaderHeight(); // Update height after becoming sticky
            }
        } else {
            if (wasSticky) {
                headerWrapper.classList.remove('is-sticky');
                updateHeaderHeight(); // Update to remove spacers
            }
        }
        
        // Calculate scroll progress (0 to 1)
        const scrollProgress = Math.min(scrollTop / (documentHeight - windowHeight), 1);
        
        // Convert to percentage
        const progressPercent = scrollProgress * 100;
        
        // Set CSS variable on header for the ::after pseudo-element width
        header.style.setProperty('--scroll-progress', progressPercent + '%');
    }
    
    // Update on scroll
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    
    // Initial update
    updateScrollProgress();
}

// Initialize collection page sidebar
let sidebarToggleInitialized = false;
let openSidebar, closeSidebar;

function initCollectionSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle-mobile');
    const sidebar = document.getElementById('collection-sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const headerWrapper = document.querySelector('.header-wrapper');
    
    if (!sidebar) return;
    
    // Only initialize toggle functionality once (toggle button is not rebuilt)
    if (!sidebarToggleInitialized) {
        sidebarToggleInitialized = true;
        
        // Function to open sidebar
        openSidebar = function() {
            sidebar.classList.add('active');
            if (sidebarToggle) sidebarToggle.classList.add('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
            
            // Change icon
            const icon = sidebarToggle?.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'x');
                lucide.createIcons();
            }
        };
        
        // Function to close sidebar
        closeSidebar = function() {
            sidebar.classList.remove('active');
            if (sidebarToggle) sidebarToggle.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            
            // Change icon
            const icon = sidebarToggle?.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'align-left');
                lucide.createIcons();
            }
        };
        
        // Mobile toggle functionality
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                if (typeof umami !== 'undefined') {
                    umami.track('Sidebar Toggle');
                }
                if (sidebar.classList.contains('active')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }
        
        // Close button functionality
        if (sidebarClose) {
            sidebarClose.addEventListener('click', function() {
                if (typeof umami !== 'undefined') {
                    umami.track('Sidebar Close');
                }
                closeSidebar();
            });
        }
        
        // Click outside to close (on overlay)
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }
    }
    
    // Get current category links
    const categoryLinks = document.querySelectorAll('.category-link');
    
    // Dynamically calculate header height and set sidebar position
    function updateSidebarPosition() {
        if (headerWrapper && sidebar) {
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // On mobile, sidebar should take full screen height
                sidebar.style.top = '0';
                sidebar.style.height = '100vh';
            } else {
                // On desktop, position below header with spacing
                const headerHeight = headerWrapper.offsetHeight;
                const spacing = 20; // Add 20px breathing space
                sidebar.style.top = (headerHeight + spacing) + 'px';
                sidebar.style.height = `calc(100vh - ${headerHeight + spacing}px)`;
            }
        }
    }
    
    // Update on load and resize
    updateSidebarPosition();
    window.addEventListener('resize', updateSidebarPosition);
    
    // Also update when announcement changes (using MutationObserver)
    if (headerWrapper) {
        const observer = new MutationObserver(updateSidebarPosition);
        observer.observe(headerWrapper, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    // Smooth scroll to section when clicking sidebar links
    function handleLinkClick(e) {
        const link = this;
        const targetId = link.getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        e.preventDefault();
        
        // Get current category links
        const currentCatLinks = document.querySelectorAll('.category-link');
        
        // Update active states
        currentCatLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Close mobile sidebar
        if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
            closeSidebar();
        }
        
        // Smooth scroll
        const headerHeight = document.querySelector('.header-wrapper')?.offsetHeight || 80;
        const targetPosition = targetElement.offsetTop - headerHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
    
    // Use event delegation on the sidebar nav to handle clicks (avoids duplicate listeners)
    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    if (sidebarNav) {
        // Remove old listener by cloning (simple way to remove all listeners)
        const navParent = sidebarNav.parentNode;
        const navClone = sidebarNav.cloneNode(true);
        navParent.replaceChild(navClone, sidebarNav);
        
        // Add new event listener using delegation
        const newNav = sidebar.querySelector('.sidebar-nav');
        if (newNav) {
            newNav.addEventListener('click', function(e) {
                // Handle category/subcategory links
                const link = e.target.closest('.subcategory-link, .category-link');
                if (link) {
                    // Track category link click in Umami
                    if (typeof umami !== 'undefined') {
                        const category = link.getAttribute('data-category') || link.getAttribute('href');
                        umami.track('Category Click', { category: category });
                    }
                    handleLinkClick.call(link, e);
                    return;
                }
                // Handle filter buttons
                const filterBtn = e.target.closest('.filter-btn');
                if (filterBtn) {
                    // Track filter click in Umami
                    if (typeof umami !== 'undefined') {
                        const filterType = filterBtn.getAttribute('data-filter');
                        const isActive = filterBtn.classList.contains('active');
                        umami.track('Filter Toggle', { filter: filterType, action: isActive ? 'deactivate' : 'activate' });
                    }
                    filterBtn.classList.toggle('active');
                    // Recompute active filter buttons from the live DOM
                    window.filterButtons = newNav.querySelectorAll('.filter-btn');
                    applyFilters();
                }
            });
        }
    }

    // Filters: NEW / CADEAUTIP
    function applyFilters() {
        const currentFilterButtons = sidebar.querySelectorAll('.filter-btn');
        const activeFilters = Array.from(currentFilterButtons).filter(b => b.classList.contains('active')).map(b => b.getAttribute('data-filter'));
        const items = document.querySelectorAll('.product-item');
        if (activeFilters.length === 0) {
            items.forEach(it => (it.style.display = ''));
            // Show all category sections again
            document.querySelectorAll('.category-section').forEach(cat => {
                cat.style.display = '';
            });
            // Restore sidebar links
            document.querySelectorAll('.category-link').forEach(link => {
                link.style.display = '';
            });
            return;
        }
        items.forEach(it => {
            const isNew = it.getAttribute('data-new') === 'true' || !!it.querySelector('.product-new-badge');
            const isCadeautip = it.getAttribute('data-cadeautip') === 'true' || !!it.querySelector('.product-cadeautip-badge');
            let show = true;
            if (activeFilters.includes('new') && !isNew) show = false;
            if (activeFilters.includes('cadeautip') && !isCadeautip) show = false;
            it.style.display = show ? '' : 'none';
        });

        // Hide category sections that have 0 visible items
        document.querySelectorAll('.category-section').forEach(cat => {
            const visibleCount = Array.from(cat.querySelectorAll('.product-grid .product-item'))
                .filter(it => it.style.display !== 'none').length;
            cat.style.display = visibleCount > 0 ? '' : 'none';
        });

        // Sync sidebar visibility with filtered content
        document.querySelectorAll('.category-link').forEach(link => {
            const targetId = link.getAttribute('href')?.substring(1);
            const target = targetId ? document.getElementById(targetId) : null;
            if (!target) return;
            link.style.display = (target.style.display === 'none') ? 'none' : '';
        });
    }

    
    // Update active state on scroll
    function updateActiveOnScroll() {
        // Get fresh references to category links
        const currentCatLinks = document.querySelectorAll('.category-link');
        const sections = document.querySelectorAll('.category-section');
        const headerHeight = document.querySelector('.header-wrapper')?.offsetHeight || 80;
        const scrollPosition = window.pageYOffset + headerHeight + 100;
        
        let activeSection = null;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                activeSection = section;
            }
        });
        
        // Remove active state from ALL links first
        currentCatLinks.forEach(link => link.classList.remove('active'));
        
        if (activeSection) {
            const sectionId = activeSection.getAttribute('id');
            const matchingLink = document.querySelector(`[href="#${sectionId}"]`);
            if (matchingLink) {
                matchingLink.classList.add('active');
            }
        }
    }
    
    window.addEventListener('scroll', updateActiveOnScroll, { passive: true });
    updateActiveOnScroll(); // Initial check
}

// Load and show popup modal
function loadPopupModal() {
    const popupModal = document.getElementById('popup-modal');
    const popupClose = document.querySelector('.popup-close');
    if (!popupModal || !popupClose) return; // Not on this page
    
    fetch('content/popup.json')
        .then(response => {
            if (!response.ok) {
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.enabled) {
                return; // Popup not enabled
            }
            
            // Check if caching is enabled (default to false - show once per session)
            const cacheDismissal = data.cacheDismissal === true;
            
            // Create a content hash based on image, title, and text to detect changes
            // Use encodeURIComponent to handle Unicode characters before btoa
            const contentString = (data.image || '') + '|' + (data.title || '') + '|' + (data.text || '');
            const contentHash = btoa(encodeURIComponent(contentString)).substring(0, 16);
            
            // Check storage based on cacheDismissal setting
            // If cacheDismissal is false (default): use sessionStorage (only for current session)
            // If cacheDismissal is true: use localStorage (persists across sessions)
            const storage = cacheDismissal ? localStorage : sessionStorage;
            const dismissedHash = storage.getItem('popup-dismissed-hash');
            if (dismissedHash === contentHash) {
                return; // This exact popup was already dismissed, don't show again
            }
            
            // Populate modal content
            const popupImage = document.getElementById('popup-image');
            const popupImageWrapper = document.getElementById('popup-image-wrapper');
            const popupTitle = document.getElementById('popup-title');
            const popupText = document.getElementById('popup-text');
            
            // Set image
            if (data.image && popupImage) {
                let imagePath = data.image;
                if (imagePath.startsWith('/')) imagePath = imagePath.substring(1);
                if (imagePath.startsWith('img/uploads/')) {
                    imagePath = imagePath.replace('img/uploads/', 'static/img/uploads/');
                }
                popupImage.src = imagePath;
                popupImage.alt = data.title || 'Popup';
                if (popupImageWrapper) {
                    popupImageWrapper.style.display = 'block';
                }
            } else if (popupImageWrapper) {
                popupImageWrapper.style.display = 'none';
            }
            
            // Set title
            if (data.title && popupTitle) {
                popupTitle.textContent = data.title;
                popupTitle.removeAttribute('hidden');
                popupTitle.style.display = '';
            } else if (popupTitle) {
                popupTitle.textContent = '';
                popupTitle.setAttribute('hidden', '');
                popupTitle.style.display = 'none';
            }
            
            // Set text
            if (data.text && popupText) {
                popupText.innerHTML = data.text;
                popupText.removeAttribute('hidden');
                popupText.style.display = '';
            } else if (popupText) {
                popupText.innerHTML = '';
                popupText.setAttribute('hidden', '');
                popupText.style.display = 'none';
            }
            
            // Show modal after a short delay
            setTimeout(() => {
                const isMobile = window.innerWidth <= 768;
                popupModal.style.display = isMobile ? 'flex' : 'block';
                // Force reflow
                popupModal.offsetHeight;
                popupModal.classList.add('show');
            }, 300);
            
            // Handle close button
            popupClose.addEventListener('click', function() {
                closePopup(contentHash, cacheDismissal);
            });
            
            // Close when clicking outside
            popupModal.addEventListener('click', function(event) {
                if (event.target === popupModal) {
                    closePopup(contentHash, cacheDismissal);
                }
            });
            
            // Close popup with Escape key
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && popupModal.classList.contains('show')) {
                    closePopup(contentHash, cacheDismissal);
                }
            });
            
            // Handle modal repositioning on resize
            let resizeTimeout;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    // Only update if modal is currently open
                    if (popupModal.classList.contains('show')) {
                        const isMobile = window.innerWidth <= 768;
                        popupModal.style.display = isMobile ? 'flex' : 'block';
                    }
                }, 100);
            });
        })
        .catch(error => {
            console.error('Error loading popup:', error);
        });
    
    function closePopup(contentHash, cacheDismissal) {
        popupModal.classList.remove('show');
        setTimeout(() => {
            popupModal.style.display = 'none';
            // Save to appropriate storage based on cacheDismissal setting
            // If cacheDismissal is false (default): use sessionStorage (only for current session)
            // If cacheDismissal is true: use localStorage (persists across sessions)
            const storage = cacheDismissal ? localStorage : sessionStorage;
            storage.setItem('popup-dismissed-hash', contentHash);
        }, 300);
    }
    
    // Helper function for debugging - can be called from console: clearPopupDismissal()
    window.clearPopupDismissal = function() {
        localStorage.removeItem('popup-dismissed-hash');
        sessionStorage.removeItem('popup-dismissed-hash');
        console.log('Popup dismissal cleared. Refresh the page to see the popup again.');
    };
}

// Initialize modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initModal();
    initOpeningsurenModal();
    loadOpeningsurenFooter();
    initScrollAnimations();
    loadGallery(); // Load homepage gallery from CMS
    loadHeroContent(); // Load homepage hero text from CMS
    loadAnnouncements();
    initScrollProgress();
    initCollectionSidebar();
    loadProducts(); // Load products from CMS
    loadReviews(); // Load Google reviews
    loadPopupModal(); // Load and show popup modal if enabled
    
    // Ensure page starts at top to show header
    window.scrollTo(0, 0);
});
// Load homepage hero content (title & subtitle) from CMS
function loadHeroContent() {
    const titleEl = document.querySelector('.hero-content h1');
    const subtitleEl = document.querySelector('.hero-content .hero-subtitle');
    if (!titleEl && !subtitleEl) return; // not on homepage
    fetch('content/hero.json')
        .then(r => r.json())
        .then(data => {
            if (titleEl && data.title) titleEl.textContent = data.title;
            if (subtitleEl && data.subtitle) {
                // Convert markdown to HTML for rich text formatting
                function markdownToHtml(text) {
                    if (!text) return '';
                    // Check if already HTML (contains tags)
                    if (text.includes('<')) {
                        return text;
                    }
                    // Convert markdown syntax to HTML
                    return text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold **text**
                        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic *text*
                        .replace(/__(.*?)__/g, '<strong>$1</strong>') // Bold __text__
                        .replace(/_(.*?)_/g, '<em>$1</em>') // Italic _text_
                        .replace(/~~(.*?)~~/g, '<del>$1</del>') // Strikethrough ~~text~~
                        .replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code `text`
                }
                subtitleEl.innerHTML = markdownToHtml(data.subtitle);
            }
        })
        .catch(() => {});
}

// Helper functions for date/week navigation
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function formatWeekRange(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const startDay = weekStart.getDate();
    const startMonth = months[weekStart.getMonth()];
    const endDay = weekEnd.getDate();
    const endMonth = months[weekEnd.getMonth()];
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
}

function isDateInPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
}

function formatDateForLookup(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to extract time from various formats
function extractTime(timeValue) {
    if (!timeValue || timeValue === '') return null;
    
    // If it's already in HH:mm format, return it
    if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
        // Normalize to HH:mm format (pad hour if needed)
        const parts = timeValue.split(':');
        const hour = parts[0].padStart(2, '0');
        const minute = parts[1];
        return `${hour}:${minute}`;
    }
    
    // If it's in ISO format (with date), extract time part
    if (typeof timeValue === 'string' && timeValue.includes('T')) {
        const timePart = timeValue.split('T')[1];
        return timePart.substring(0, 5); // Get HH:mm
    }
    
    // If it's a Date object, format it
    if (timeValue instanceof Date) {
        const hours = String(timeValue.getHours()).padStart(2, '0');
        const minutes = String(timeValue.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    return null;
}

// Convert hours data to old format string (handles both string and object formats)
function convertHoursToOldFormat(dayData) {
    // If it's already a string, return it
    if (typeof dayData === 'string') {
        return dayData;
    }
    
    // If it's null or undefined, return closed
    if (!dayData) {
        return 'Gesloten';
    }
    
    // If it's an object with closed flag
    if (dayData.closed) {
        return 'Gesloten';
    }
    
    // Build time ranges from morning/afternoon
    const parts = [];
    
    // Handle morning (voormiddag)
    if (dayData.morning && dayData.morning.open && dayData.morning.close) {
        const morningOpen = extractTime(dayData.morning.open);
        const morningClose = extractTime(dayData.morning.close);
        if (morningOpen && morningClose) {
            parts.push(`${morningOpen} - ${morningClose}`);
        }
    }
    
    // Handle afternoon (namiddag)
    if (dayData.afternoon && dayData.afternoon.open && dayData.afternoon.close) {
        const afternoonOpen = extractTime(dayData.afternoon.open);
        const afternoonClose = extractTime(dayData.afternoon.close);
        if (afternoonOpen && afternoonClose) {
            parts.push(`${afternoonOpen} - ${afternoonClose}`);
        }
    }
    
    if (parts.length === 0) {
        return 'Gesloten';
    }
    
    return parts.join(' en ');
}

// Global variable to store custom dates (loaded separately)
let customDatesData = null;

// Load custom dates from separate JSON file
function loadCustomDates() {
    return fetch('content/custom-dates.json')
        .then(r => {
            if (!r.ok) {
                return null;
            }
            return r.json();
        })
        .then(data => {
            customDatesData = data;
            return data;
        })
        .catch((err) => {
            customDatesData = null;
            return null;
        });
}

// Get hours for a specific date (check customDates first, then default)
function getHoursForDate(data, date) {
    const dateStr = formatDateForLookup(date);
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    const dayIndex = date.getDay();
    const dayName = dayNames[dayIndex];
    
    // Check customDates from separate file first (highest priority)
    if (customDatesData && customDatesData.customDates && Array.isArray(customDatesData.customDates)) {
        for (const customDate of customDatesData.customDates) {
            if (customDate.date === dateStr) {
                // Check if it's the old string format (backward compatibility)
                if (customDate.hours) {
                    return customDate.hours;
                }
                // Check if it's the new structured format (morning/afternoon)
                // If date exists in customDates, it overrides default hours
                // Check if morning or afternoon are explicitly set (even if null)
                const hasMorning = customDate.morning !== undefined;
                const hasAfternoon = customDate.afternoon !== undefined;
                
                // If either field is defined (even if null), use the custom date
                if (hasMorning || hasAfternoon) {
                    // If both are null/undefined, the shop is closed
                    const isClosed = !customDate.morning && !customDate.afternoon;
                    return {
                        closed: isClosed,
                        morning: customDate.morning || null,
                        afternoon: customDate.afternoon || null
                    };
                }
                // If date exists but no hours defined, treat as closed
                // This handles cases where date is added but fields are not filled
                return {
                    closed: true,
                    morning: null,
                    afternoon: null
                };
            }
        }
    }
    
    // Check customDates in main data (backward compatibility)
    if (data.customDates && Array.isArray(data.customDates)) {
        for (const customDate of data.customDates) {
            if (customDate.date === dateStr) {
                if (customDate.hours) {
                    return customDate.hours;
                } else if (customDate.morning || customDate.afternoon || customDate.closed !== undefined) {
                    return {
                        closed: customDate.closed || false,
                        morning: customDate.morning || null,
                        afternoon: customDate.afternoon || null
                    };
                }
            }
        }
    }
    
    // Check old custom structure (for backward compatibility)
    if (data.custom && Array.isArray(data.custom)) {
        for (const custom of data.custom) {
            if (custom.date === dateStr) {
                if (custom[dayName]) {
                    return custom[dayName];
                }
            }
            if (custom.dateRange) {
                const start = new Date(custom.dateRange.start);
                const end = new Date(custom.dateRange.end);
                const checkDate = new Date(dateStr);
                if (checkDate >= start && checkDate <= end) {
                    if (custom[dayName]) {
                        return custom[dayName];
                    }
                }
            }
        }
    }
    
    // Fall back to default (new structure)
    if (data.default && data.default[dayName]) {
        return data.default[dayName];
    }
    
    // Fall back to old default structure (backward compatibility)
    if (data[dayName]) {
        return data[dayName];
    }
    
    return null;
}

// Helper function to parse hours string and determine status
function parseHoursStatus(hoursString, isToday) {
    if (!isToday) {
        return { status: null, subtext: '' };
    }
    
    const hours = hoursString.trim();
    
    // Check if closed
    if (hours.toLowerCase() === 'gesloten' || hours === '') {
        return { status: 'closed', subtext: '' };
    }
    
    // Parse time ranges (e.g., "10:00 - 12:00 en 14:00 - 18:00" or "14:00 - 18:00")
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Convert to minutes
    
    // Split by "en" to handle multiple ranges
    const ranges = hours.split(' en ').map(r => r.trim());
    
    let isOpen = false;
    let closingTime = null;
    let nextOpeningTime = null;
    
    for (const range of ranges) {
        // Match pattern like "10:00 - 12:00" or "14:00 - 18:00"
        const match = range.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        if (match) {
            const openHour = parseInt(match[1]);
            const openMinute = parseInt(match[2]);
            const closeHour = parseInt(match[3]);
            const closeMinute = parseInt(match[4]);
            
            const openTime = openHour * 60 + openMinute;
            const closeTime = closeHour * 60 + closeMinute;
            
            // Check if currently open
            if (currentTime >= openTime && currentTime < closeTime) {
                isOpen = true;
                closingTime = closeTime;
                break;
            }
            
            // Track next opening time if we're before it
            if (currentTime < openTime) {
                if (nextOpeningTime === null || openTime < nextOpeningTime) {
                    nextOpeningTime = openTime;
                }
            }
        }
    }
    
    if (isOpen && closingTime) {
        // Check if closing within 30 minutes
        const minutesUntilClose = closingTime - currentTime;
        if (minutesUntilClose <= 30) {
            return { status: 'closing-soon', subtext: 'We sluiten bijna' };
        }
        return { status: 'open', subtext: 'Wij zijn open' };
    }
    
    // Check if store will open within 2 hours (120 minutes)
    if (nextOpeningTime !== null) {
        const minutesUntilOpen = nextOpeningTime - currentTime;
        if (minutesUntilOpen <= 120 && minutesUntilOpen > 0) {
            return { status: 'opening-soon', subtext: 'We gaan binnenkort open' };
        }
    }
    
    return { status: 'closed', subtext: 'We zijn momenteel gesloten' };
}

// Populate all footer hours grids from CMS
// Footer shows current week with custom date overrides (like modal)
function loadOpeningsurenFooter() {
    const grids = document.querySelectorAll('.hours-grid');
    const weekRangeDisplay = document.getElementById('footer-week-range');
    if (grids.length === 0) return;
    
    // Load both openingsuren and custom dates (footer should check custom dates for current week)
    Promise.all([
        fetch('content/openingsuren.json').then(r => r.json()),
        loadCustomDates()
    ]).then(([data, customDates]) => {
        // Ensure customDatesData is set
        if (customDates && customDates.customDates) {
            customDatesData = customDates;
        }
        
        // Calculate current week (Monday to Sunday)
        const today = new Date();
        const currentWeekStart = getWeekStart(today);
        const todayStr = formatDateForLookup(today);
        
        // Display "Deze week" instead of date range
        if (weekRangeDisplay) {
            weekRangeDisplay.textContent = 'Deze week';
        }
        
        const dayNames = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
        const dayNamesLower = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
        
        // Check if data has new structure (with default/custom) or old structure
        const hasNewStructure = data.default !== undefined;
        
        const daysArray = dayNames.map((dayName, index) => {
            // Calculate the actual date for this day of the week
            const dayDate = new Date(currentWeekStart);
            dayDate.setDate(currentWeekStart.getDate() + index);
            const dayDateStr = formatDateForLookup(dayDate);
            const isToday = dayDateStr === todayStr;
            
            // Use getHoursForDate to check customDates first, then default (like modal)
            const dayData = getHoursForDate(data, dayDate);
            let hours = '';
            
            if (dayData) {
                // Convert to old format string (handles both string and object)
                hours = convertHoursToOldFormat(dayData);
            } else {
                // Fallback to old structure if no customDates and no new structure
                if (!hasNewStructure) {
                    hours = data[dayNamesLower[index]] || '';
                } else {
                    hours = 'Gesloten';
                }
            }
            
            return {
                day: dayName,
                hours: hours,
                isToday: isToday
            };
        });
        
        const html = daysArray.map(d => {
            const statusInfo = parseHoursStatus(d.hours, d.isToday);
            const isAlwaysClosed = d.hours.toLowerCase() === 'gesloten' || d.hours === '';
            const showSubtext = statusInfo.subtext && (!isAlwaysClosed || statusInfo.status === 'open');
            
            // Format hours to display time ranges vertically
            const formattedHours = d.hours.includes(' en ') 
                ? d.hours.split(' en ').map(range => range.trim()).join('<br>')
                : d.hours;
            
            return `
                <div class="day-hours${d.isToday ? ' is-today' : ''}${statusInfo.status ? ' status-' + statusInfo.status : ''}" ${d.isToday ? 'aria-current="date"' : ''}>
                    <div class="day-wrapper">
                        <span class="day">${d.day}</span>
                        ${showSubtext ? `<span class="hours-subtext">${statusInfo.subtext}</span>` : ''}
                    </div>
                    <span class="hours">${formattedHours}</span>
                </div>
            `;
        }).join('');
        grids.forEach(g => g.innerHTML = html);
    })
    .catch(() => {});
}

// Initialize openingsuren modal
function initOpeningsurenModal() {
    const modal = document.getElementById('openingsuren-modal');
    if (!modal) return;
    
    const openBtn = document.getElementById('openingsuren-btn');
    const closeBtn = modal.querySelector('.openingsuren-close');
    const prevBtn = modal.querySelector('#date-picker-prev');
    const nextBtn = modal.querySelector('#date-picker-next');
    const dateRangeDisplay = modal.querySelector('#date-picker-range');
    
    let currentWeekStart = getWeekStart(new Date());
    let openingsurenData = null;
    
    // Inject hours into modal for a specific week
    function renderModalHours(data, weekStart) {
        openingsurenData = data;
        const container = modal.querySelector('.modal-hours');
        if (!container) return;
        
        // Check if data has new structure (with default/custom) or old structure
        const hasNewStructure = data.default !== undefined;
        
        const dayNames = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
        const dayNamesLower = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
        
        const today = new Date();
        const todayStr = formatDateForLookup(today);
        
        const daysArray = dayNames.map((dayName, index) => {
            // Create a new date object for each day to avoid mutation issues
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + index);
            const dayDateStr = formatDateForLookup(dayDate);
            const isToday = dayDateStr === todayStr;
            
            // Always use getHoursForDate to check customDates first, then default
            const dayData = getHoursForDate(data, dayDate);
            let hours = '';
            
            if (dayData) {
                // Convert to old format string (handles both string and object)
                hours = convertHoursToOldFormat(dayData);
            } else {
                // Fallback to old structure if no customDates and no new structure
                if (!hasNewStructure) {
                    hours = data[dayNamesLower[index]] || '';
                } else {
                    hours = 'Gesloten';
                }
            }
            
            return {
                day: dayName,
                hours: hours,
                isToday: isToday,
                dayData: dayData
            };
        });
        
        container.innerHTML = daysArray.map(d => {
            const statusInfo = parseHoursStatus(d.hours, d.isToday);
            const isAlwaysClosed = d.hours.toLowerCase() === 'gesloten' || d.hours === '';
            const showSubtext = statusInfo.subtext && (!isAlwaysClosed || statusInfo.status === 'open');
            
            // Format hours to display time ranges vertically
            const formattedHours = d.hours.includes(' en ') 
                ? d.hours.split(' en ').map(range => range.trim()).join('<br>')
                : d.hours;
            
            return `
                <div class="modal-day-hours${d.isToday ? ' is-today' : ''}${statusInfo.status ? ' status-' + statusInfo.status : ''}" ${d.isToday ? 'aria-current="date"' : ''}>
                    <div class="modal-day-wrapper">
                        <span class="modal-day">${d.day}</span>
                        ${showSubtext ? `<span class="modal-hours-subtext">${statusInfo.subtext}</span>` : ''}
                    </div>
                    <span class="modal-hours-text">${formattedHours}</span>
                </div>
            `;
        }).join('');
        
        // Update date range display
        const datePickerLabel = modal.querySelector('.date-picker-label');
        if (dateRangeDisplay) {
            const today = new Date();
            const todayWeekStart = getWeekStart(today);
            const isCurrentWeek = formatDateForLookup(todayWeekStart) === formatDateForLookup(weekStart);
            
            if (datePickerLabel) {
                if (isCurrentWeek) {
                    datePickerLabel.textContent = 'Deze week';
                } else {
                    // Calculate weeks ahead
                    const weeksDiff = Math.round((weekStart - todayWeekStart) / (7 * 24 * 60 * 60 * 1000));
                    if (weeksDiff === 1) {
                        datePickerLabel.textContent = 'Volgende week';
                    } else if (weeksDiff > 1) {
                        datePickerLabel.textContent = `${weeksDiff} weken vooruit`;
                    } else {
                        datePickerLabel.textContent = '';
                    }
                }
            }
            dateRangeDisplay.textContent = formatWeekRange(weekStart);
        }
        
        // Update navigation buttons
        const todayWeekStart = getWeekStart(today);
        const isCurrentWeek = formatDateForLookup(weekStart) === formatDateForLookup(todayWeekStart);
        
        if (prevBtn) {
            if (isCurrentWeek) {
                prevBtn.setAttribute('disabled', '');
            } else {
                prevBtn.removeAttribute('disabled');
            }
        }
        if (nextBtn) {
            // Allow going forward indefinitely
            nextBtn.removeAttribute('disabled');
        }
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    // Navigation handlers
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (!prevBtn.disabled && openingsurenData) {
                currentWeekStart = new Date(currentWeekStart);
                currentWeekStart.setDate(currentWeekStart.getDate() - 7);
                renderModalHours(openingsurenData, currentWeekStart);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (!nextBtn.disabled && openingsurenData) {
                currentWeekStart = new Date(currentWeekStart);
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                renderModalHours(openingsurenData, currentWeekStart);
            }
        });
    }
    
    // Open modal
    if (openBtn) {
        openBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const isMobile = window.innerWidth <= 768;
            modal.style.display = isMobile ? 'flex' : 'block';
            modal.offsetHeight;
            modal.classList.add('show');
        });
    }
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === modal) closeModal();
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // Handle modal repositioning on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only update if modal is currently open
            if (modal.classList.contains('show')) {
                const isMobile = window.innerWidth <= 768;
                modal.style.display = isMobile ? 'flex' : 'block';
            }
        }, 50);
    });
    
    // Load hours and custom dates, then render into modal
    // Modal SHOULD check custom dates (unlike footer)
    Promise.all([
        fetch('content/openingsuren.json').then(r => r.json()),
        loadCustomDates()
    ]).then(([data, customDates]) => {
        openingsurenData = data; // Store for navigation
        currentWeekStart = getWeekStart(new Date());
        // Ensure customDatesData is set before rendering
        if (customDates && customDates.customDates) {
            customDatesData = customDates;
        }
        renderModalHours(data, currentWeekStart);
    })
    .catch(() => {});
}

// Load homepage gallery (bento box) from JSON and render
function loadGallery() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return; // Not on homepage

    fetch('content/gallery.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Gallery file not found');
            }
            return response.json();
        })
        .then(data => {
            const items = data.gallery || [];
            if (items.length === 0) return;

            const html = items.map((item, idx) => {
                let imagePath = item.image;
                if (imagePath.startsWith('/')) imagePath = imagePath.substring(1);
                if (imagePath.startsWith('img/uploads/')) {
                    imagePath = imagePath.replace('img/uploads/', 'static/img/uploads/');
                }
                const content = `
                    <img src="${encodeURI(imagePath)}" alt="${item.alt || 'Gallery'}">
                    <div class="gallery-overlay">Bekijk onze collectie</div>
                `;
                const wrapperOpen = item.href ? `<a href="${item.href}" class="gallery-item">` : `<div class="gallery-item">`;
                const wrapperClose = item.href ? `</a>` : `</div>`;
                return `${wrapperOpen}${content}${wrapperClose}`;
            }).join('');

            grid.innerHTML = html;
            // Re-init animations after injecting
            initScrollAnimations();
            
            // Add Umami tracking to gallery items
            const galleryItems = document.querySelectorAll('.gallery-item');
            galleryItems.forEach(item => {
                item.addEventListener('click', function() {
                    if (typeof umami !== 'undefined') {
                        umami.track('Gallery Item Click');
                    }
                });
            });
        })
        .catch(() => {
            // Silent fallback to static gallery
        });
}

// Dark mode toggle functionality
(function() {
    // Check for saved theme preference or use system preference
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = saved || (prefersDark ? 'dark' : 'light');
    
    // Apply theme on page load (if not already set by inline script)
    if (!document.documentElement.getAttribute('data-theme')) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.documentElement.style.colorScheme = currentTheme === 'dark' ? 'dark' : 'light';
    }
    
    // Update toggle button state and icons
    function updateToggleButton(theme) {
        const toggle = document.getElementById('dark-mode-toggle-header');
        const sunIcon = toggle?.querySelector('.theme-icon-sun');
        const moonIcon = toggle?.querySelector('.theme-icon-moon');
        
        if (toggle) {
            const isDark = theme === 'dark';
            toggle.setAttribute('aria-checked', isDark ? 'true' : 'false');
            
            if (sunIcon && moonIcon) {
                if (isDark) {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                } else {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                }
            }
        }
    }
    
    // Initialize toggle button
    function initDarkModeToggle() {
        const toggle = document.getElementById('dark-mode-toggle-header');
        if (!toggle) return;
        
        // Set initial state
        const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
        updateToggleButton(initialTheme);
        
        toggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Update toggle state and icons
            updateToggleButton(newTheme);
            
            // Reinitialize Lucide icons after theme change
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkModeToggle);
    } else {
        initDarkModeToggle();
    }
})();

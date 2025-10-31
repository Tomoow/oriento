// Your JavaScript code here

document.addEventListener('DOMContentLoaded', function() {
    console.log('Oriento is ready!');
    
    // Load brands carousel
    loadBrands();
    
    // Hamburger menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const headerWrapper = document.querySelector('.header-wrapper');
    
    function updateMenuPosition() {
        if (!navMenu || !headerWrapper) return;
        
        const announcement = document.getElementById('announcement-banner');
        const isAnnouncementVisible = announcement && announcement.style.display !== 'none';
        const siteHeader = document.querySelector('.site-header');
        const headerHeight = siteHeader ? siteHeader.offsetHeight : 80;
        const announcementHeight = isAnnouncementVisible ? announcement.offsetHeight : 0;
        const totalHeight = headerHeight + announcementHeight;
        
        // Position menu below header/announcement instead of using padding
        navMenu.style.top = totalHeight + 'px';
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
                const stars = '★'.repeat(review.rating || 5);
                
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
    carousel.scrollTo({
        left: 0,
        behavior: 'auto' // Instant, no animation on initial load
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

// Modal functionality
function initModal() {
    const modal = document.getElementById('retour-modal');
    if (!modal) return;
    
    const modalContent = document.getElementById('retour-content');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Retour content (NL)
    const retourContent = `
        <h2>Retour & Ruilen</h2>
        <p><strong>Cadeau of toch niet helemaal wat je zocht?</strong><br>
        Geen probleem! We ruilen graag om voor een ander exemplaar, zodat je helemaal tevreden bent.</p>
        <p><strong>Let op:</strong></p>
        <ul>
            <li>We nemen geen gebruikte producten terug om hygiënische redenen (bijvoorbeeld oorbellen die al gedragen zijn).</li>
            <li>Vergeet je kasticket niet, zo kunnen we alles snel regelen.</li>
        </ul>
        <p><strong>Wettelijke info:</strong><br>
        Bij aankopen in de winkel is er geen verplicht recht op retour (behalve bij defecten), maar wij doen dit graag als service.</p>
        <p>Bedankt voor je begrip en veel plezier met je aankoop!</p>
    `;
    
    // Privacy content
    const privacyContent = `
        <h2>Privacy</h2>
        <p>Welkom op onze website! Deze pagina geeft informatie over onze winkel en producten.</p>
        <h3>1. Doel van de website</h3>
        <p>Onze website is uitsluitend bedoeld om informatie te delen over onze fysieke winkel en producten. Er is geen online verkoop en we vragen geen persoonlijke gegevens via deze site.</p>
        <h3>2. Privacy</h3>
        <p>Wij respecteren jouw privacy.</p>
        <ul>
            <li>We verzamelen geen persoonsgegevens via deze website.</li>
            <li>Voor statistieken gebruiken we Umami, een cookieloos systeem dat geen persoonlijke data opslaat.</li>
        </ul>
    `;
    
           // Modal trigger logic
           document.querySelectorAll('.footer-link, .footer-bottom-link').forEach(link => {
               link.addEventListener('click', function(e) {
                   e.preventDefault();
                   const modalType = this.getAttribute('data-modal');
                   
                   if (modalType === 'retour') {
                       modalContent.innerHTML = retourContent;
                   } else if (modalType === 'algemene-voorwaarden') {
                       modalContent.innerHTML = privacyContent;
                   }
                   
                   // Use flex for mobile bottom sheet, block for desktop
                   const isMobile = window.innerWidth <= 768;
                   modal.style.display = isMobile ? 'flex' : 'block';
                   // force reflow before adding class to ensure transition
                   // eslint-disable-next-line no-unused-expressions
                   modal.offsetHeight;
                   modal.classList.add('show');
               });
           });
    
           // Close modal
           function closeModal() {
               modal.classList.remove('show');
               // wait for transition to finish before hiding
               setTimeout(() => {
                   modal.style.display = 'none';
               }, 300);
           }
    
    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
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
            
            // New schema: nested objects per category -> subcategory -> list of products
            // Example: data.juwelen.oorbellen = [{ image, alt, new, cadeautip }, ...]
            const categoryMap = {};
            const categories = ['juwelen', 'accessoires', 'wonen'];
            categories.forEach(cat => {
                if (!data[cat]) return;
                categoryMap[cat] = {};
                const subs = Array.isArray(data[cat].subcategories) ? data[cat].subcategories : [];
                subs.forEach(entry => {
                    const sub = entry && entry.subcategory;
                    if (!sub) return;
                    const items = Array.isArray(entry.items) ? entry.items : [];
                    categoryMap[cat][sub] = items.map(item => ({
                        category: cat,
                        subcategory: sub,
                        image: item.image,
                        alt: item.alt,
                        brand: item.brand,
                        new: !!item.new,
                        cadeautip: !!item.cadeautip
                    }));
                });
            });
            
            const hasAny = Object.keys(categoryMap).some(cat => Object.keys(categoryMap[cat]).some(sub => (categoryMap[cat][sub] || []).length > 0));
            if (!hasAny) {
                initProductScrollAnimations();
                initProductModal();
                return;
            }

            // Rebuild sidebar and content dynamically (configurable sections)
            const sidebarList = document.querySelector('.category-list');
            const collectionMain = document.querySelector('.collection-main');
            if (sidebarList && collectionMain) {
                // Sidebar
                sidebarList.innerHTML = Object.keys(categoryMap).map(category => {
                    const subLinks = Object.keys(categoryMap[category]).map(sub => (
                        `<li><a href="#${category}-${sub}" class="subcategory-link" data-category="${category}" data-subcategory="${sub}">${formatLabel(sub)}</a></li>`
                    )).join('');
                    return `
                        <li class="category-item">
                            <a href="#${category}" class="category-link" data-category="${category}">
                                <h3>${formatLabel(category)}</h3>
                            </a>
                            <ul class="subcategory-list">${subLinks}</ul>
                        </li>
                    `;
                }).join('');

                // Content sections
                collectionMain.innerHTML = Object.keys(categoryMap).map(category => {
                    const subSections = Object.keys(categoryMap[category]).map(sub => (
                        `
                        <div id="${category}-${sub}" class="subcategory-section" data-subcategory="${sub}">
                            <h2>${formatLabel(sub)}</h2>
                            <div class="product-grid"></div>
                        </div>
                        `
                    )).join('');
                    return `
                        <section id="${category}" class="category-section" data-category="${category}">
                            <h1>${formatLabel(category)}</h1>
                            ${subSections}
                        </section>
                    `;
                }).join('');

                // Re-init sidebar interactions after rebuilding
                initCollectionSidebar();
            }
            
            // Render products in their respective grids
            Object.keys(categoryMap).forEach(category => {
                Object.keys(categoryMap[category]).forEach(subcategory => {
                    const section = document.getElementById(`${category}-${subcategory}`);
                    const grid = section ? section.querySelector('.product-grid') : null;
                    if (!grid) return;

                    const html = categoryMap[category][subcategory].map(product => {
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
            });
            
            // Initialize scroll animations after products are loaded
            setTimeout(() => {
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
            // Check if announcements are enabled
            if (!data.enabled || !data.announcements || data.announcements.length === 0) {
                return;
            }
            
            // Get active announcements
            const activeAnnouncements = data.announcements.filter(ann => ann.active);
            
            if (activeAnnouncements.length === 0) {
                return;
            }
            
            // Combine all active announcements on one line (replace line breaks with spaces)
            const combinedText = activeAnnouncements.map(ann => ann.text.replace(/\n/g, ' ').trim()).join(' • ');
            textElement.textContent = combinedText;
            
            // Show banner
            banner.style.display = 'block';
            
            // Initialize Lucide icons for close button
            lucide.createIcons();
        })
        .catch(error => {
            console.log('Announcements not available:', error);
        });
    
    // Handle close button
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            banner.style.display = 'none';
        });
    }
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
                if (sidebar.classList.contains('active')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }
        
        // Close button functionality
        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }
        
        // Click outside to close (on overlay)
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }
    }
    
    // Get current links (they may have been rebuilt)
    const subcategoryLinks = document.querySelectorAll('.subcategory-link');
    const categoryLinks = document.querySelectorAll('.category-link');
    // filter buttons will be handled via delegation on sidebar nav
    
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
        
        // Get current links (they may have been rebuilt)
        const currentSubLinks = document.querySelectorAll('.subcategory-link');
        const currentCatLinks = document.querySelectorAll('.category-link');
        
        // Update active states
        if (link.classList.contains('subcategory-link')) {
            currentSubLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Also update category link
            const category = link.getAttribute('data-category');
            currentCatLinks.forEach(l => {
                if (l.getAttribute('data-category') === category) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
        } else {
            currentCatLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
        
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
                    handleLinkClick.call(link, e);
                    return;
                }
                // Handle filter buttons
                const filterBtn = e.target.closest('.filter-btn');
                if (filterBtn) {
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
            // Show all subcategory sections again
            document.querySelectorAll('.subcategory-section').forEach(sec => {
                sec.style.display = '';
            });
            // Show all main category sections again
            document.querySelectorAll('.category-section').forEach(cat => {
                cat.style.display = '';
            });
            // Restore sidebar links
            document.querySelectorAll('.subcategory-link, .category-link').forEach(link => {
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

        // Hide subcategory sections that have 0 visible items
        document.querySelectorAll('.subcategory-section').forEach(sec => {
            const visibleCount = Array.from(sec.querySelectorAll('.product-grid .product-item'))
                .filter(it => it.style.display !== 'none').length;
            sec.style.display = visibleCount > 0 ? '' : 'none';
        });

        // Hide main categories that have 0 visible subcategory sections
        document.querySelectorAll('.category-section').forEach(cat => {
            const hasVisibleSub = Array.from(cat.querySelectorAll('.subcategory-section'))
                .some(sec => sec.style.display !== 'none');
            cat.style.display = hasVisibleSub ? '' : 'none';
        });

        // Sync sidebar visibility with filtered content
        // Subcategory links
        document.querySelectorAll('.subcategory-link').forEach(link => {
            const targetId = link.getAttribute('href')?.substring(1);
            const target = targetId ? document.getElementById(targetId) : null;
            if (!target) return;
            link.style.display = (target.style.display === 'none') ? 'none' : '';
        });
        // Category links (hide if all its subcategory links are hidden)
        document.querySelectorAll('.category-link').forEach(catLink => {
            const category = catLink.getAttribute('data-category');
            const subLinks = document.querySelectorAll(`.subcategory-link[data-category="${category}"]`);
            const anyVisible = Array.from(subLinks).some(l => l.style.display !== 'none');
            catLink.style.display = anyVisible ? '' : 'none';
        });
    }

    
    // Update active state on scroll
    function updateActiveOnScroll() {
        // Get fresh references to links (they may have been rebuilt)
        const currentSubLinks = document.querySelectorAll('.subcategory-link');
        const currentCatLinks = document.querySelectorAll('.category-link');
        const sections = document.querySelectorAll('.category-section, .subcategory-section');
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
        currentSubLinks.forEach(link => link.classList.remove('active'));
        currentCatLinks.forEach(link => link.classList.remove('active'));
        
        if (activeSection) {
            const sectionId = activeSection.getAttribute('id');
            const matchingLink = document.querySelector(`[href="#${sectionId}"]`);
            if (matchingLink) {
                matchingLink.classList.add('active');
                
                // If it's a subcategory, also highlight parent category
                if (matchingLink.classList.contains('subcategory-link')) {
                    const category = matchingLink.getAttribute('data-category');
                    const categoryLink = document.querySelector(`.category-link[data-category="${category}"]`);
                    if (categoryLink) {
                        categoryLink.classList.add('active');
                    }
                }
            }
        }
    }
    
    window.addEventListener('scroll', updateActiveOnScroll, { passive: true });
    updateActiveOnScroll(); // Initial check
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
    loadModalText(); // Load modal text from CMS
    
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
            if (subtitleEl && data.subtitle) subtitleEl.textContent = data.subtitle;
        })
        .catch(() => {});
}

// Load modal text for product modal on collectie page
function loadModalText() {
    const modalTextEl = document.getElementById('product-modal-text');
    if (!modalTextEl) return; // not on collectie page
    fetch('content/modal-text.json')
        .then(r => r.json())
        .then(data => {
            if (data.text) {
                modalTextEl.innerHTML = data.text;
            }
        })
        .catch(() => {});
}
// Populate all footer hours grids from CMS
function loadOpeningsurenFooter() {
    const grids = document.querySelectorAll('.hours-grid');
    if (grids.length === 0) return;
    fetch('content/openingsuren.json')
        .then(r => r.json())
        .then(data => {
            const days = data.days || [];
            const todayName = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'][new Date().getDay()];
            const html = days.map(d => {
                const isToday = String(d.day).trim().toLowerCase().includes(todayName);
                return `
                    <div class="day-hours${isToday ? ' is-today' : ''}" ${isToday ? 'aria-current="date"' : ''}>
                        <span class="day">${d.day}</span>
                        <span class="hours ${d.closed ? 'closed' : ''}">${d.hours}</span>
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
    
    // Inject hours into modal
    function renderModalHours(days) {
        const container = modal.querySelector('.modal-hours');
        if (!container) return;
        const todayName = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'][new Date().getDay()];
        container.innerHTML = days.map(d => {
            const isToday = String(d.day).trim().toLowerCase().includes(todayName);
            return `
                <div class="modal-day-hours${isToday ? ' is-today' : ''}" ${isToday ? 'aria-current="date"' : ''}>
                    <span class="modal-day">${d.day}</span>
                    <span class="modal-hours-text ${d.closed ? 'closed' : ''}">${d.hours}</span>
                </div>
            `;
        }).join('');
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
    
    // Load hours and render into modal
    fetch('content/openingsuren.json')
      .then(r => r.json())
      .then(data => renderModalHours(data.days || []))
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
        })
        .catch(() => {
            // Silent fallback to static gallery
        });
}

// Dark mode toggle functionality
(function() {
    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme on page load
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Update toggle button state and label
    function updateToggleButton(theme) {
        const toggle = document.getElementById('dark-mode-toggle');
        const label = toggle?.querySelector('.toggle-label');
        
        if (toggle && label) {
            const isDark = theme === 'dark';
            toggle.setAttribute('aria-checked', isDark ? 'true' : 'false');
            label.textContent = isDark ? 'Light mode' : 'Dark mode';
        }
    }
    
    // Initialize toggle button
    function initDarkModeToggle() {
        const toggle = document.getElementById('dark-mode-toggle');
        if (!toggle) return;
        
        // Set initial state
        const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
        updateToggleButton(initialTheme);
        
        toggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Update toggle state and label
            updateToggleButton(newTheme);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkModeToggle);
    } else {
        initDarkModeToggle();
    }
})();

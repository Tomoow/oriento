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

// Load reviews from JSON and render carousel
function loadReviews() {
    const carousel = document.getElementById('reviews-carousel');
    if (!carousel) return;
    
    fetch('content/reviews.json')
        .then(response => {
            if (!response.ok) {
                // If file doesn't exist, show placeholder message
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
            
            // Sort reviews: 5-star reviews first, then by date (most recent first)
            const sortedReviews = [...reviews].sort((a, b) => {
                if (b.rating !== a.rating) {
                    return b.rating - a.rating; // Higher rating first
                }
                return 0; // Keep original order for same rating
            });
            
            const html = sortedReviews.map(review => {
                // Generate initials from name
                const initials = review.author ? review.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
                
                // Generate stars HTML
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
            
            // Initialize Lucide icons for arrow buttons and CTA
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // Initialize carousel navigation after content is loaded
            setTimeout(() => {
                initReviewsCarousel();
                // Re-initialize icons after carousel is set up
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
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
    const titleWrapper = document.querySelector('.reviews-title-wrapper');
    
    if (!carousel || !leftArrow || !rightArrow || !titleWrapper) return;
    
    // Function to check if arrows should be visible
    function checkArrowVisibility() {
        const scrollWidth = carousel.scrollWidth;
        const clientWidth = carousel.clientWidth;
        const canScroll = scrollWidth > clientWidth;
        
        if (canScroll) {
            leftArrow.style.display = 'flex';
            rightArrow.style.display = 'flex';
        } else {
            leftArrow.style.display = 'none';
            rightArrow.style.display = 'none';
        }
    }
    
    // Simple scroll functions
    leftArrow.addEventListener('click', () => {
        carousel.scrollBy({
            left: -400,
            behavior: 'smooth'
        });
    });
    
    rightArrow.addEventListener('click', () => {
        carousel.scrollBy({
            left: 400,
            behavior: 'smooth'
        });
    });
    
    // Check visibility on load and resize
    checkArrowVisibility();
    window.addEventListener('resize', checkArrowVisibility);
    
    // Also check after images load
    carousel.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', checkArrowVisibility);
    });
    
    
    // Touch/swipe gesture support
    let isDown = false;
    let startX;
    let scrollLeftStart;
    
    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        carousel.style.cursor = 'grabbing';
        startX = e.pageX - carousel.offsetLeft;
        scrollLeftStart = carousel.scrollLeft;
    });
    
    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });
    
    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });
    
    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        carousel.scrollLeft = scrollLeftStart - walk;
    });
    
    // Touch events for mobile
    let touchStartX = 0;
    let touchScrollLeft = 0;
    
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].pageX - carousel.offsetLeft;
        touchScrollLeft = carousel.scrollLeft;
    }, { passive: true });
    
    carousel.addEventListener('touchmove', (e) => {
        if (!touchStartX) return;
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (touchStartX - x) * 2; // Scroll speed
        carousel.scrollLeft = touchScrollLeft + walk;
    }, { passive: true });
    
    carousel.addEventListener('touchend', () => {
        touchStartX = 0;
    });
    
    // Set initial cursor style
    carousel.style.cursor = 'grab';
}

// Modal functionality
function initModal() {
    const modal = document.getElementById('retour-modal');
    if (!modal) return;
    
    const modalContent = document.getElementById('retour-content');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Retour content
    const retourContent = `
        <h2>Retourneren & Ruilen</h2>
        <h3>Recht van Teruggave</h3>
        <p>U kunt de ontvangen artikelen binnen de 10 dagen aan ons retourneren. Deze termijn gaat in op het moment dat de artikelen door u zijn ontvangen. De kosten van de retourzending zijn voor rekening van de klant. Bij het retourneren kunt u gebruik maken van het meegestuurde retourformulier.</p>
        <p>Na ontvangst van het retourpakket storten wij het aankoopbedrag op uw rekening.</p>
        <p>Wanneer u via bankoverschrijving heeft betaald, noteer dan bij de retourzending uw bankgegevens. Bankgegevens worden door ons niet opgeslagen.</p>
        
        <h3>Ruilen</h3>
        <p>Een artikel kan niet omgeruild worden tegen een ander artikel.</p>
        
        <h3>Retourvoorwaarden</h3>
        <ul>
            <li>Bij het retourneren van de artikelen dient een volledig ingevuld formulier te worden bijgevoegd.</li>
            <li>Retourneringen dienen gefrankeerd verzonden te worden, ongefrankeerde retourneringen worden niet geaccepteerd.</li>
            <li>De artikelen dienen ongebruikt en in de originele verpakking te worden verzonden.</li>
            <li>De kosten van de retourzending zijn ten laste van de klant.</li>
        </ul>
        
        <h3>Retourneren in verband met een klacht</h3>
        <p>Met de grootst mogelijke zorgvuldigheid behandelen wij de producten en verwerken wij de bestelling. Toch kan er wel eens iets misgaan:</p>
        <ul>
            <li>Per ongeluk is het verkeerde artikel toegezonden</li>
            <li>Uw bestelling is tijdens de verzending beschadigd geraakt.</li>
            <li>Een artikel vertoont een fabricagefout</li>
        </ul>
        <p>Meld ons een eventuele klacht zo snel mogelijk en in ieder geval binnen de 5 werkdagen. Neem voordat u het artikel terugzendt even contact met ons op, want de klacht moet wel duidelijk zichtbaar en kenbaar worden gemaakt. U kunt bij een gegronde klacht het artikel gratis terugsturen. Vanzelfsprekend sturen wij een eventueel vervangend item kosteloos naar u toe.</p>
        <p>Bent u te laat met het indienen van de klacht, zijn wij gerechtigd alle kosten voor reparatie of vervanging, inclusief administratie en verzendkosten, in rekening te brengen.</p>
        
        <p><strong>Terugbetaalverplichtingen worden door ons binnen de 30 dagen volbracht. De termijn gaat in vanaf het moment dat het retourpakket door ons ontvangen en verwerkt is.</strong></p>
        
        <h3>Het retourpakket kunt u sturen naar:</h3>
        <p>Oriento webshop<br>
        Otegemstraat 31<br>
        8550 Zwevegem<br>
        België<br><br>
        E-Mail: info@oriento.net</p>
    `;
    
    // Algemene voorwaarden content
    const algemeneVoorwaardenContent = `
        <h2>Algemene Voorwaarden</h2>
        <h3>Koopovereenkomst</h3>
        <p>Zodra u een bevestigingsmail van ons ontvangen heeft, gaat de koopovereenkomst van start. De leveringstermijn gebeurt binnen de 5 werkdagen na ontvangst van uw betaling. Mocht het van onze kant toch tot een langere leveringstermijn komen, dan wordt u door ons geïnformeerd.</p>
        <p>U bent verplicht de gekochte producten af te nemen op het moment waarop deze u ter beschikking worden gesteld.</p>
        <p>Indien u de afname weigert of nalatig bent met het verstrekken van informatie of instructies, noodzakelijk voor de levering, zullen de voor de levering bestemde producten worden opgeslagen voor uw risico en rekening.</p>
        <p>Indien u zelf een verkeerd adres heeft opgegeven voor de levering, dan zijn de extra verzendkosten voor uw rekening.</p>
        <p>Bij overschrijding van de maximale levertijd van 30 dagen hebt u het recht de overeenkomst kosteloos te ontbinden. Hiervoor dient u een e-mail of brief aan Oriento webshop te sturen. Eventuele betalingen worden in dat geval binnen de 30 dagen na de kennisgeving aan u geretourneerd.</p>
        
        <h3>Eigendomsvoorbehoud</h3>
        <p>Zolang geen volledige betaling van het ons uit welken hoofde ook van koper toekomende heeft plaatsgevonden, blijft het geleverde ons voor rekening en risico van koper in eigendom toebehoren.</p>
        
        <h3>Klachten</h3>
        <p>Klachten moeten binnen de 5 werkdagen na levering per aangetekende brief ingediend worden. Alle prijzen zijn gebaseerd op de actueel in voege zijnde reglementeringen en kunnen aangepast worden bij wijziging of ingevolge overmacht.</p>
        
        <h3>Betwistingen</h3>
        <p>In geval van betwisting is alleen de handelsrechtbank van ons rechtsgebied bevoegd.</p>
    `;
    
           // Modal trigger logic
           document.querySelectorAll('.footer-link, .footer-bottom-link').forEach(link => {
               link.addEventListener('click', function(e) {
                   e.preventDefault();
                   const modalType = this.getAttribute('data-modal');
                   
                   if (modalType === 'retour') {
                       modalContent.innerHTML = retourContent;
                   } else if (modalType === 'algemene-voorwaarden') {
                       modalContent.innerHTML = algemeneVoorwaardenContent;
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
                Object.keys(data[cat]).forEach(sub => {
                    const items = Array.isArray(data[cat][sub]) ? data[cat][sub] : [];
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
        item.addEventListener('click', () => {
            let image = item.getAttribute('data-image') || '';
            let alt = item.getAttribute('data-alt') || '';
            let brand = item.getAttribute('data-brand') || '';

            // Fallback to the actual IMG element inside the card when CMS data is not present
            if (!image) {
                const imgElInCard = item.querySelector('img');
                if (imgElInCard) {
                    image = imgElInCard.getAttribute('src') || '';
                    alt = alt || imgElInCard.getAttribute('alt') || 'Product';
                }
            }
            // If brand still missing, reuse alt (Brand name in CMS maps to alt)
            if (!brand) {
                brand = alt || '';
            }
            const isNew = item.getAttribute('data-new') === 'true';
            const isCadeautip = item.getAttribute('data-cadeautip') === 'true';
            
            if (imgEl) {
                imgEl.src = image;
                imgEl.alt = alt;
            }
            if (brandEl) {
                brandEl.textContent = brand || 'Product';
            }
            if (badgesEl) {
                badgesEl.innerHTML = `${isNew ? '<span class="product-new-badge">NEW</span>' : ''}${isCadeautip ? '<span class="product-cadeautip-badge">CADEAUTIP</span>' : ''}`;
            }
            
            open();
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
    
    // Function to update header height
    function updateHeaderHeight() {
        headerWrapperHeight = headerWrapper.offsetHeight;
        headerTop = headerWrapper.offsetTop;
        
        // Add spacer to prevent content jump when header becomes sticky
        if (heroSection) {
            if (headerWrapper.classList.contains('is-sticky')) {
                heroSection.style.marginTop = headerWrapperHeight + 'px';
            } else {
                heroSection.style.marginTop = '';
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
                if (heroSection) {
                    heroSection.style.marginTop = '';
                }
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
                const link = e.target.closest('.subcategory-link, .category-link');
                if (link) {
                    handleLinkClick.call(link, e);
                }
            });
        }
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
    initScrollAnimations();
    loadGallery(); // Load homepage gallery from CMS
    loadAnnouncements();
    initScrollProgress();
    initCollectionSidebar();
    loadProducts(); // Load products from CMS
    loadReviews(); // Load Google reviews
    
    // Ensure page starts at top to show header
    window.scrollTo(0, 0);
});

// Initialize openingsuren modal
function initOpeningsurenModal() {
    const modal = document.getElementById('openingsuren-modal');
    if (!modal) return;
    
    const openBtn = document.getElementById('openingsuren-btn');
    const closeBtn = modal.querySelector('.openingsuren-close');
    
    // Open modal
    if (openBtn) {
        openBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Use flex for mobile bottom sheet, block for desktop
            const isMobile = window.innerWidth <= 768;
            modal.style.display = isMobile ? 'flex' : 'block';
            // force reflow before adding class to ensure transition
            // eslint-disable-next-line no-unused-expressions
            modal.offsetHeight;
            modal.classList.add('show');
        });
    }
    
    // Close modal helper with slide-down
    function closeModal() {
        modal.classList.remove('show');
        // wait for transition to finish before hiding
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside content
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
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

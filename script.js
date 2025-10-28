// Your JavaScript code here

document.addEventListener('DOMContentLoaded', function() {
    console.log('Oriento is ready!');
    
    // Load brands carousel
    loadBrands();
    
    // Hamburger menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
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
            
            // Render brands twice for seamless loop
            const html = brands.map(brand => `
                <div class="brand-item">
                    <img src="${brand.logo}" alt="${brand.name}">
                </div>
            `).join('');
            
            // Duplicate for seamless scrolling
            carousel.innerHTML = html + html;
        })
        .catch(error => {
            console.error('Error loading brands:', error);
            // Fallback: show error message
            carousel.innerHTML = '<p>Brands coming soon...</p>';
        });
}

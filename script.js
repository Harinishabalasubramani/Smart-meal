// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Navbar active link highlighting
window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Set home as active when at top
    if (scrollPosition < 100) {
        navLinks[0].classList.add('active');
    }
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Observe step cards
document.querySelectorAll('.step-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Add ripple effect to buttons
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Page load animation
window.addEventListener('load', () => {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.animation = 'slideUp 0.8s ease-out';
    }
});

// Add some interactive features for future expansion
console.log('SmartMeal - Smart Meal Recommendation System');
console.log('Website loaded successfully!');

// -------- Foodora Input + MealMatch Logic --------
const STORAGE_KEYS = {
    inputs: 'foodoraInputs',
    history: 'foodoraHistory',
    authUser: 'foodoraAuthUser'
};
const PROTECTED_PAGES = new Set(['index.html', 'what-i-have.html']);

function getCurrentPageName() {
    const path = window.location.pathname || '';
    const page = path.split('/').pop();
    return page && page.length ? page.toLowerCase() : 'index.html';
}

function getAuthUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.authUser);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(STORAGE_KEYS.authUser);
        return null;
    }
}

function setAuthUser(user) {
    localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user));
}

function clearAuthUser() {
    localStorage.removeItem(STORAGE_KEYS.authUser);
}

function enforceAuthGuard() {
    const page = getCurrentPageName();
    const authUser = getAuthUser();

    if (PROTECTED_PAGES.has(page) && !authUser) {
        window.location.href = 'login.html';
        return false;
    }

    return true;
}

function initSessionControls() {
    document.querySelectorAll('[data-action="logout"]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            clearAuthUser();
            window.location.href = 'login.html';
        });
    });
}

const dishCatalog = [
    {
        id: 'paneer-butter-masala',
        name: 'Paneer Butter Masala',
        cuisine: 'North Indian',
        time: 30,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800',
        ingredients: ['paneer', 'tomato', 'butter', 'garlic', 'onion', 'ginger'],
        instructions: 'Sauté onions, ginger, and garlic. Add tomato puree and spices. Simmer, add paneer and cream, finish with butter.',
        steps: ['Cut paneer into cubes', 'Blanch tomatoes and puree', 'Sauté onions until golden', 'Add ginger-garlic paste', 'Add tomato puree and spices', 'Add paneer and simmer', 'Finish with cream and butter'],
        nutrition: { cal: 250, protein: '18g', carbs: '8g', fat: '16g' }
    },
    {
        id: 'chole',
        name: 'Chole (Chickpea Curry)',
        cuisine: 'Punjabi',
        time: 35,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1585238341710-4dd0fa06133d?w=800',
        ingredients: ['chickpeas', 'tomato', 'onion', 'garlic', 'ginger'],
        instructions: 'Cook chickpeas until tender. Prepare onion-tomato masala, add spices, then simmer with chickpeas.',
        steps: ['Soak and cook chickpeas until soft', 'Chop onions and tomatoes', 'Sauté onions until brown', 'Add ginger and garlic', 'Add tomato puree', 'Add boiled chickpeas', 'Simmer for 15 mins', 'Season to taste'],
        nutrition: { cal: 220, protein: '15g', carbs: '28g', fat: '4g' }
    },
    {
        id: 'masala-dosa',
        name: 'Masala Dosa',
        cuisine: 'South Indian',
        time: 25,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1694159098892-31bebc487fc1?w=800',
        ingredients: ['rice', 'potato', 'onion', 'mustard seeds'],
        instructions: 'Prepare dosa batter. Cook potato masala with spices. Spread batter on hot tawa and fill with masala.',
        steps: ['Ferment rice-lentil batter', 'Cut potatoes and boil', 'Chop onions', 'Prepare potato masala with mustard seeds', 'Heat tawa', 'Spread batter thinly', 'Fill with potato masala', 'Fold and serve'],
        nutrition: { cal: 280, protein: '8g', carbs: '52g', fat: '3g' }
    },
    {
        id: 'palak-paneer',
        name: 'Palak Paneer',
        cuisine: 'North Indian',
        time: 30,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800',
        ingredients: ['spinach', 'paneer', 'garlic', 'onion'],
        instructions: 'Blanch spinach, blend to puree. Cook onion-tomato base, add spinach puree and paneer.',
        steps: ['Blanch spinach for 2 mins', 'Blend spinach to smooth puree', 'Cut paneer into cubes', 'Sauté onions and garlic', 'Add spinach puree', 'Add paneer cubes', 'Simmer for 10 mins', 'Season with salt and pepper'],
        nutrition: { cal: 190, protein: '20g', carbs: '6g', fat: '10g' }
    },
    {
        id: 'lemon-rice',
        name: 'Lemon Rice',
        cuisine: 'South Indian',
        time: 15,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=800',
        ingredients: ['rice', 'mustard seeds', 'peanuts'],
        instructions: 'Temper mustard seeds, curry leaves, peanuts. Add cooked rice, turmeric, lemon juice, and mix.',
        steps: ['Cook rice until done', 'Heat oil in pan', 'Add mustard seeds and let splutter', 'Add peanuts', 'Add curry leaves', 'Pour over hot rice', 'Mix well', 'Add lemon juice and salt'],
        nutrition: { cal: 180, protein: '4g', carbs: '36g', fat: '2g' }
    },
    {
        id: 'vegetable-upma',
        name: 'Vegetable Upma',
        cuisine: 'South Indian',
        time: 20,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800',
        ingredients: ['onion', 'peas'],
        instructions: 'Roast semolina. Cook vegetables with tempering, add water, then stir in semolina until fluffy.',
        steps: ['Roast semolina until fragrant', 'Cut vegetables finely', 'Heat oil and add mustard seeds', 'Add onions and green chillies', 'Add other vegetables', 'Add water', 'Stir in semolina gradually', 'Cook until fluffy', 'Season to taste'],
        nutrition: { cal: 160, protein: '5g', carbs: '28g', fat: '3g' }
    },
    {
        id: 'tomato-curry',
        name: 'Tomato Curry',
        cuisine: 'Indian',
        time: 20,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1598023696416-0193a0bcd302?w=800',
        ingredients: ['tomato', 'onion', 'garlic', 'ginger'],
        instructions: 'Quick tomato-based curry that pairs with rice or bread.',
        steps: ['Chop onions', 'Sauté onions until golden', 'Add ginger-garlic paste', 'Add tomatoes', 'Simmer for 10 mins', 'Season with salt and spices'],
        nutrition: { cal: 120, protein: '3g', carbs: '18g', fat: '4g' }
    },
    {
        id: 'potato-curry',
        name: 'Aloo Curry',
        cuisine: 'Indian',
        time: 25,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1645696261221-f3f6e5eeeb60?w=800',
        ingredients: ['potato', 'onion', 'garlic', 'ginger'],
        instructions: 'Simple and delicious potato curry.',
        steps: ['Cut potatoes into cubes', 'Boil until half cooked', 'Sauté onions', 'Add ginger and garlic', 'Add potatoes', 'Simmer until soft', 'Season to taste'],
        nutrition: { cal: 140, protein: '2g', carbs: '28g', fat: '3g' }
    },
    {
        id: 'dal-rice',
        name: 'Dal & Rice',
        cuisine: 'Indian',
        time: 30,
        diet: 'Veg',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',
        ingredients: ['rice', 'lentils', 'onion', 'garlic', 'ginger'],
        instructions: 'Comfort food: cooked lentils paired with steamed rice.',
        steps: ['Wash rice and lentils', 'Cook rice separately', 'Cook lentils with water and turmeric', 'Temper mustard seeds in oil', 'Pour tempering over dal', 'Mix cooked dal with rice', 'Season to taste'],
        nutrition: { cal: 310, protein: '12g', carbs: '54g', fat: '2g' }
    }
];

function getStoredInputs() {
    const raw = localStorage.getItem(STORAGE_KEYS.inputs);
    return raw ? JSON.parse(raw) : null;
}

function getStoredHistory() {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    return raw ? JSON.parse(raw) : [];
}

function saveHistory(entry) {
    const history = getStoredHistory();
    history.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 10)));
}

function uniqueList(items) {
    return Array.from(new Set(items.filter(Boolean)));
}

function parseCustomList(value) {
    return value
        .split(',')
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
}

function getSelectedIngredients() {
    const checked = Array.from(document.querySelectorAll('.ingredient-input:checked')).map(input => input.value);
    const leftovers = Array.from(document.querySelectorAll('input[name="leftover"]:checked')).map(input => input.value);
    const custom = document.getElementById('custom-ingredients')?.value || '';
    const customLeftovers = document.getElementById('custom-leftovers')?.value || '';
    return uniqueList([...checked, ...leftovers, ...parseCustomList(custom), ...parseCustomList(customLeftovers)]);
}

function renderSelectedIngredients(list) {
    const container = document.getElementById('selected-ingredients-list');
    if (!container) return;
    container.innerHTML = '';
    if (!list.length) {
        container.innerHTML = '<span class="muted">No ingredients selected yet.</span>';
        return;
    }
    list.forEach(item => {
        const badge = document.createElement('span');
        badge.className = 'ingredient-pill';
        badge.textContent = item;
        container.appendChild(badge);
    });
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const history = getStoredHistory();
    list.innerHTML = '';
    if (!history.length) {
        list.innerHTML = '<li class="muted">No history yet.</li>';
        return;
    }
    history.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.time} • ${entry.label}`;
        list.appendChild(li);
    });
}

function getViewedMealHistory() {
    const rawMealHistory = localStorage.getItem('mealHistory');
    if (rawMealHistory) {
        try {
            const parsed = JSON.parse(rawMealHistory);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            console.warn('Unable to parse mealHistory from localStorage', error);
        }
    }
    return [];
}

function initHomeHistory() {
    const listContainer = document.getElementById('home-history-list');
    const emptyState = document.getElementById('home-history-empty');
    if (!listContainer || !emptyState) return;

    const history = getViewedMealHistory();
    listContainer.innerHTML = '';

    if (!history.length) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    history.slice(0, 6).forEach((meal, index) => {
        const card = document.createElement('article');
        card.className = 'home-history-card';
        const detailId = `home-history-steps-${index}`;
        const viewedAt = meal.viewedAt ? new Date(meal.viewedAt).toLocaleString() : 'Recently';
        const steps = Array.isArray(meal.steps) ? meal.steps : [];
        const stepsHtml = steps.length
            ? `<ol>${steps.map(step => `<li>${step}</li>`).join('')}</ol>`
            : '<p class="muted">Cooking steps not available.</p>';
        card.innerHTML = `
            <h3>${meal.name || 'Meal'}</h3>
            <p class="home-history-meta">Last viewed: ${viewedAt}</p>
            <button type="button" class="home-history-toggle" aria-expanded="false" aria-controls="${detailId}">View cooking steps</button>
            <div id="${detailId}" class="home-history-steps" style="display: none;">
                ${stepsHtml}
            </div>
        `;

        const toggleButton = card.querySelector('.home-history-toggle');
        const detailPanel = card.querySelector('.home-history-steps');
        toggleButton.addEventListener('click', () => {
            const isOpen = detailPanel.style.display === 'block';
            detailPanel.style.display = isOpen ? 'none' : 'block';
            toggleButton.setAttribute('aria-expanded', String(!isOpen));
            toggleButton.textContent = isOpen ? 'View cooking steps' : 'Hide cooking steps';
        });

        listContainer.appendChild(card);
    });
}

function initWhatIHave() {
    const saveButton = document.getElementById('save-inputs');
    if (!saveButton) return;

    // Attach listeners to checkboxes
    const ingredientInputs = document.querySelectorAll('.ingredient-input, input[name="leftover"]');
    ingredientInputs.forEach(input => {
        input.addEventListener('change', () => {
            renderSelectedIngredients(getSelectedIngredients());
        });
    });

    // Attach listeners to custom input boxes
    const customIngredientsBox = document.getElementById('custom-ingredients');
    const customLeftoversBox = document.getElementById('custom-leftovers');
    
    if (customIngredientsBox) {
        customIngredientsBox.addEventListener('input', () => {
            renderSelectedIngredients(getSelectedIngredients());
        });
    }
    
    if (customLeftoversBox) {
        customLeftoversBox.addEventListener('input', () => {
            renderSelectedIngredients(getSelectedIngredients());
        });
    }

    // Attach listeners to suggested ingredient buttons
    document.querySelectorAll('.suggested-ingredient').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const ingredient = button.dataset.ingredient;
            const customBox = document.getElementById('custom-ingredients');
            if (!customBox) return;
            
            const current = parseCustomList(customBox.value);
            if (!current.includes(ingredient)) {
                current.push(ingredient);
                customBox.value = current.join(', ');
            }
            renderSelectedIngredients(getSelectedIngredients());
            saveHistory({
                time: new Date().toLocaleString(),
                label: `Added ingredient: ${ingredient}`
            });
            renderHistory();
        });
    });

    saveButton.addEventListener('click', (e) => {
        e.preventDefault();
        const ingredients = getSelectedIngredients();
        const cookTime = document.querySelector('input[name="cook-time"]:checked')?.value || '';
        const mealType = document.getElementById('meal-type')?.value || '';
        const servings = document.getElementById('servings')?.value || '';
        const spiceLevel = document.getElementById('spice-level')?.value || '';

        if (ingredients.length === 0) {
            alert('Please select at least one ingredient!');
            return;
        }

        const payload = {
            ingredients,
            cookTime: cookTime || '30',
            mealType,
            servings,
            spiceLevel
        };

        localStorage.setItem(STORAGE_KEYS.inputs, JSON.stringify(payload));
        saveHistory({
            time: new Date().toLocaleString(),
            label: `Saved inputs: ${ingredients.join(', ')}`
        });
        renderHistory();
        renderSelectedIngredients(ingredients);
        alert('✅ Inputs saved! You can now go to MealMatch to see recommendations.');
    });

    renderSelectedIngredients(getSelectedIngredients());
    renderHistory();
}

function scoreDish(dish, ingredients) {
    if (!ingredients.length) return 0;
    const set = new Set(ingredients);
    const matchCount = dish.ingredients.filter(item => set.has(item)).length;
    const matchPercent = matchCount / dish.ingredients.length;
    return matchPercent >= 0.5 ? matchCount * 100 + matchPercent * 1000 : -1;
}

function displayMealDetail(dish, userIngredients) {
    const detail = document.getElementById('meal-detail');
    const matchedIngredients = dish.ingredients.filter(ing => userIngredients.includes(ing));
    const unmatchedIngredients = dish.ingredients.filter(ing => !userIngredients.includes(ing));

    const stepsHtml = dish.steps
        ? dish.steps.map((step, idx) => `<div class="step-item"><span class="step-num">${idx + 1}</span> ${step}</div>`).join('')
        : '';

    const nutritionHtml = dish.nutrition
        ? `<div class="nutrition-grid">
            <div class="nutrition-item"><strong>${dish.nutrition.cal}</strong> Cal</div>
            <div class="nutrition-item"><strong>${dish.nutrition.protein}</strong> Protein</div>
            <div class="nutrition-item"><strong>${dish.nutrition.carbs}</strong> Carbs</div>
            <div class="nutrition-item"><strong>${dish.nutrition.fat}</strong> Fat</div>
          </div>`
        : '';

    detail.innerHTML = `
        <div class="meal-detail-card">
            <div class="meal-detail-header">
                <div class="meal-detail-image-wrapper">
                    <img src="${dish.image}" alt="${dish.name}" class="meal-detail-image" onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(dish.name)}'">
                </div>
                <div class="meal-detail-info">
                    <h2>${dish.name}</h2>
                    <p class="meal-detail-meta">
                        🍽️ ${dish.cuisine} • ⏱️ ${dish.time} min • 👥 ${dish.diet}
                    </p>
                    <p class="meal-detail-description">${dish.instructions}</p>
                </div>
            </div>

            <div class="meal-detail-tabs">
                <button class="tab-btn active" data-tab="ingredients">Ingredients</button>
                <button class="tab-btn" data-tab="steps">Cooking Steps</button>
                <button class="tab-btn" data-tab="nutrition">Nutrition</button>
            </div>

            <div class="meal-detail-body">
                <div class="tab-content active" id="tab-ingredients">
                    <h3>Ingredients needed</h3>
                    <div class="ingredients-list">
                        ${matchedIngredients.length > 0 ? `
                            <div class="ingredient-section">
                                <h4>✅ You have these</h4>
                                <div class="ingredient-items">
                                    ${matchedIngredients.map(ing => `<span class="ingredient-tag matched">✓ ${ing}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${unmatchedIngredients.length > 0 ? `
                            <div class="ingredient-section">
                                <h4>🛒 You need to buy</h4>
                                <div class="ingredient-items">
                                    ${unmatchedIngredients.map(ing => `<span class="ingredient-tag missing">+ ${ing}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="tab-content" id="tab-steps">
                    <h3>Step-by-step cooking guide</h3>
                    <div class="steps-list">
                        ${stepsHtml}
                    </div>
                </div>

                <div class="tab-content" id="tab-nutrition">
                    <h3>Nutritional information (per serving)</h3>
                    ${nutritionHtml}
                </div>
            </div>

            <div class="meal-detail-footer">
                <button class="btn btn-primary" type="button">💖 Save recipe</button>
                <button class="btn btn-secondary" type="button">📤 Share</button>
            </div>
        </div>
    `;

    // Tab switching
    detail.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            detail.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            detail.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });
}

function initMealMatch() {
    const grid = document.getElementById('meal-grid');
    if (!grid) return;

    const summaryIngredients = document.getElementById('summary-ingredients');
    const summaryTime = document.getElementById('summary-time');
    const summaryMealType = document.getElementById('summary-meal-type');
    const summaryServings = document.getElementById('summary-servings');
    const detail = document.getElementById('meal-detail');

    const inputs = getStoredInputs();
    
    if (!inputs || !inputs.ingredients || inputs.ingredients.length === 0) {
        grid.innerHTML = '<div class="no-match"><p class="muted">📝 Please go to \"What I Have\" page and save your ingredients first!</p></div>';
        summaryIngredients.textContent = 'Not provided';
        summaryTime.textContent = 'Not provided';
        summaryMealType.textContent = 'Not provided';
        summaryServings.textContent = 'Not provided';
        return;
    }

    const ingredients = inputs.ingredients || [];
    const cookTime = inputs.cookTime ? Number(inputs.cookTime) : null;

    summaryIngredients.textContent = ingredients.length ? ingredients.join(', ') : 'Not provided';
    summaryTime.textContent = cookTime ? `≤ ${cookTime} min` : 'Not provided';
    summaryMealType.textContent = inputs?.mealType || 'Not provided';
    summaryServings.textContent = inputs?.servings || 'Not provided';

    let candidates = dishCatalog.slice();
    if (cookTime) {
        candidates = candidates.filter(dish => dish.time <= cookTime);
    }

    const ranked = candidates
        .map(dish => ({ dish, score: scoreDish(dish, ingredients) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.dish.time - b.dish.time)
        .slice(0, 6);

    grid.innerHTML = '';
    ranked.forEach(({ dish, score }) => {
        const card = document.createElement('div');
        card.className = 'meal-card';
        card.innerHTML = `
            <div class="meal-card-image-wrapper">
                <img src="${dish.image}" alt="${dish.name}" class="meal-card-image" onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(dish.name)}'">
            </div>
            <div class="meal-card-body">
                <h3>${dish.name}</h3>
                <p class="meal-meta">🍽️ ${dish.cuisine} • ⏱️ ${dish.time} min</p>
                <button class="btn btn-primary" type="button">View recipe</button>
            </div>
        `;
        card.querySelector('button').addEventListener('click', () => {
            displayMealDetail(dish, ingredients);
        });
        grid.appendChild(card);
    });

    if (!ranked.length) {
        grid.innerHTML = '<div class="no-match"><p class="muted">🔍 No dishes matched your ingredients. Try adding more ingredients or increase cooking time.</p></div>';
    }
}

async function registerUser(payload) {
    const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Unable to create account right now.');
    }
    return data;
}

async function loginUser(payload) {
    const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Unable to sign in right now.');
    }
    return data;
}

function initAuthPage() {
    const form = document.getElementById('auth-form');
    if (!form) return;

    const message = document.getElementById('auth-message');
    const submitButton = form.querySelector('button[type="submit"]');
    const modeButtons = form.querySelectorAll('.auth-mode-btn');
    const nameFields = document.getElementById('name-fields');
    const subtitle = document.getElementById('auth-subtitle');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');

    let authMode = 'signup';

    function applyAuthMode(mode) {
        authMode = mode;
        const isSignIn = mode === 'signin';

        modeButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });

        nameFields.classList.toggle('auth-hidden', isSignIn);
        firstNameInput.required = !isSignIn;
        lastNameInput.required = !isSignIn;

        submitButton.textContent = isSignIn ? 'Sign In' : 'Create Account';
        subtitle.textContent = isSignIn
            ? 'Sign in with your email and password.'
            : 'Use your details to create an account.';
        message.textContent = '';
        message.className = 'auth-message';
    }

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            applyAuthMode(button.dataset.mode || 'signup');
        });
    });

    applyAuthMode('signup');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstName = document.getElementById('first-name')?.value.trim() || '';
        const lastName = document.getElementById('last-name')?.value.trim() || '';
        const email = document.getElementById('email')?.value.trim() || '';
        const password = document.getElementById('password')?.value || '';

        if (!email || !password || (authMode === 'signup' && (!firstName || !lastName))) {
            message.textContent = 'Please complete all fields.';
            message.className = 'auth-message error';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = authMode === 'signin' ? 'Signing in...' : 'Creating account...';
        message.textContent = '';

        try {
            if (authMode === 'signin') {
                const result = await loginUser({ email, password });
                const userName = result.user?.first_name || 'User';
                setAuthUser({
                    first_name: result.user?.first_name || '',
                    last_name: result.user?.last_name || '',
                    email: result.user?.email || email,
                    login_time: new Date().toISOString()
                });
                message.textContent = `Welcome back, ${userName}. Login successful.`;
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            } else {
                await registerUser({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password
                });
                message.textContent = 'Account created successfully. You can now sign in.';
            }
            message.className = 'auth-message success';
            form.reset();
        } catch (error) {
            message.textContent = error.message || 'Unable to connect to backend.';
            message.className = 'auth-message error';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!enforceAuthGuard()) {
        return;
    }

    initSessionControls();

    initHomeHistory();

    // Only init What I Have on what-i-have.html
    if (document.getElementById('step-ingredients')) {
        initWhatIHave();
    }
    
    // Only init MealMatch on MealMatch.html
    if (document.getElementById('meal-grid')) {
        initMealMatch();
    }

    // Only init auth on login.html
    if (document.getElementById('auth-form')) {
        initAuthPage();
    }
});

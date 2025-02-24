// Elementos do DOM
const pokemonContainer = document.getElementById("pokemonContainer");
const searchInput = document.getElementById("search-input");
const generationFilter = document.getElementById("generation-filter");
const loading = document.getElementById("loading");
const pagination = document.getElementById("pagination");
const paginationBottom = document.getElementById("paginationBottom");
const scrollTopButton = document.getElementById("scrollTop");

// Variáveis globais
let allPokemon = [];
let filteredPokemon = [];
let currentPage = parseInt(localStorage.getItem('lastPokemonPage') || '1');
let lastGeneration = localStorage.getItem('lastGeneration') || 'all';
const pokemonPerPage = 12;

// Ranges das gerações
const generationRanges = {
    '1': { start: 1, end: 151 },
    '2': { start: 152, end: 251 },
    '3': { start: 252, end: 386 },
    '4': { start: 387, end: 493 },
    '5': { start: 494, end: 649 },
    '6': { start: 650, end: 721 },
    '7': { start: 722, end: 809 },
    '8': { start: 810, end: 905 },
    '9': { start: 906, end: 1010 }
};

// Função de busca de Pokémon
async function fetchPokemon() {
    try {
        // Mostra o loading
        if (loading) loading.style.display = 'flex';

        // Define um timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1010', {
            signal: controller.signal
        });

        // Limpa o timeout
        clearTimeout(timeoutId);

        // Verifica se a resposta foi bem-sucedida
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const promises = data.results.map(async (pokemon, index) => {
            const id = index + 1;
            try {
                const detailResponse = await fetch(pokemon.url);
                
                // Verifica se o detalhe do Pokémon foi carregado corretamente
                if (!detailResponse.ok) {
                    console.warn(`Não foi possível carregar detalhes do Pokémon ${pokemon.name}`);
                    return null;
                }

                const details = await detailResponse.json();
                return {
                    id: id,
                    name: pokemon.name,
                    image: details.sprites.other['official-artwork'].front_default || details.sprites.front_default,
                    types: details.types.map(type => type.type.name)
                };
            } catch (detailError) {
                console.warn(`Erro ao carregar detalhes de ${pokemon.name}:`, detailError);
                return null;
            }
        });

        // Remove entradas nulas
        allPokemon = (await Promise.all(promises)).filter(pokemon => pokemon !== null);
        filteredPokemon = [...allPokemon];

        // Garante que a lista não está vazia
        if (allPokemon.length === 0) {
            throw new Error('Nenhum Pokémon foi carregado');
        }

        // Restaura a geração
        if (lastGeneration !== 'all') {
            generationFilter.value = lastGeneration;
            filterByGeneration(lastGeneration);
        } else {
            // Atualiza a display com a página salva
            currentPage = parseInt(localStorage.getItem('lastPokemonPage') || '1');
            updateDisplay();
        }

    } catch (error) {
        console.error('Erro ao carregar os Pokémon:', error);
        
        if (pokemonContainer) {
            pokemonContainer.innerHTML = `
                <div class="error-container">
                    <p class="error">Erro ao carregar os Pokémon. Por favor, tente novamente.</p>
                    <button onclick="fetchPokemon()">Recarregar</button>
                </div>
            `;
        }
    } finally {
        // Garante que o loading seja sempre ocultado
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// Filtra por geração
function filterByGeneration(generation) {
    localStorage.setItem('lastGeneration', generation);
    
    if (generation === 'all') {
        filteredPokemon = [...allPokemon];
    } else {
        const range = generationRanges[generation];
        filteredPokemon = allPokemon.filter(pokemon => 
            pokemon.id >= range.start && pokemon.id <= range.end
        );
    }
    
    currentPage = 1;
    localStorage.setItem('lastPokemonPage', '1');
    updateDisplay();
    updatePagination();
}

// Filtra os Pokémon
function filterPokemon() {
    const searchTerm = searchInput.value.toLowerCase();
    const generation = generationFilter.value || 'all';
    
    // Salva a geração atual
    localStorage.setItem('lastGeneration', generation);
    
    filteredPokemon = allPokemon.filter(pokemon => {
        const matchesSearch = pokemon.name.toLowerCase().includes(searchTerm) ||
                            pokemon.id.toString().includes(searchTerm) ||
                            pokemon.types.some(type => type.toLowerCase().includes(searchTerm));
        
        if (generation === 'all') {
            return matchesSearch;
        }
        
        const range = generationRanges[generation];
        return matchesSearch && pokemon.id >= range.start && pokemon.id <= range.end;
    });
    
    currentPage = 1;
    localStorage.setItem('lastPokemonPage', '1');
    updateDisplay();
}

// Atualiza a exibição dos Pokémon
function updateDisplay() {
    const totalPages = Math.ceil(filteredPokemon.length / pokemonPerPage);
    const start = (currentPage - 1) * pokemonPerPage;
    const end = start + pokemonPerPage;
    const currentPokemon = filteredPokemon.slice(start, end);
    
    pokemonContainer.innerHTML = currentPokemon.map(pokemon => `
        <div class="pokemon-card" onclick="window.location.href='details.html?id=${pokemon.id}'">
            <div class="pokemon-image">
                <img src="${pokemon.image}" alt="${pokemon.name}">
            </div>
            <div class="pokemon-info">
                <span class="pokemon-number">Nº ${String(pokemon.id).padStart(3, '0')}</span>
                <h3>${formatPokemonName(pokemon.name)}</h3>
                <div class="pokemon-types">
                    ${pokemon.types.map(type => `<span class="pokemon-type type-${type.toLowerCase()}">${capitalize(type)}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    updatePagination(totalPages);
}

// Atualiza a paginação
function updatePagination(totalPages) {
    const createPaginationHTML = () => {
        let html = '';
        
        // Botão anterior (<)
        html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">‹</button>`;
        
        // Número da página atual
        html += `<span class="page-number">${currentPage}</span>`;
        
        // Botão próximo (>)
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">›</button>`;
        
        return html;
    };

    const paginationHTML = createPaginationHTML();
    pagination.innerHTML = paginationHTML;
    paginationBottom.innerHTML = paginationHTML;
}

// Muda de página
function changePage(page) {
    currentPage = page;
    localStorage.setItem('lastPokemonPage', page.toString());
    updateDisplay();
    window.scrollTo(0, 0);
}

// Formata o nome do Pokémon
function formatPokemonName(name) {
    const specialCases = {
        'nidoran-f': 'Nidoran♀',
        'nidoran-m': 'Nidoran♂',
        'mr-mime': 'Mr. Mime',
        'ho-oh': 'Ho-Oh',
        'porygon-z': 'Porygon-Z',
        'mime-jr': 'Mime Jr.',
        'type-null': 'Type: Null',
        'jangmo-o': 'Jangmo-o',
        'hakamo-o': 'Hakamo-o',
        'kommo-o': 'Kommo-o',
        'tapu-koko': 'Tapu Koko',
        'tapu-lele': 'Tapu Lele',
        'tapu-bulu': 'Tapu Bulu',
        'tapu-fini': 'Tapu Fini'
    };

    if (specialCases[name]) {
        return specialCases[name];
    }

    return name.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Capitaliza a primeira letra
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Rola para o topo
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Evento de scroll para mostrar botão de rolagem
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopButton.classList.add('visible');
    } else {
        scrollTopButton.classList.remove('visible');
    }
});

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    fetchPokemon();
    
    // Restaura a geração selecionada
    if (lastGeneration && generationFilter) {
        generationFilter.value = lastGeneration;
    }
    
    searchInput.addEventListener('input', filterPokemon);
    generationFilter.addEventListener('change', (e) => filterByGeneration(e.target.value));
});
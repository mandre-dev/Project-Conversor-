document.addEventListener('DOMContentLoaded', () => {
    const fileSelector = document.getElementById('file-selector');
    const fileList = document.getElementById('file-list');
    const placeholder = fileList.querySelector('.placeholder-item');

    let selectedFiles = [];
    let currentOpenMenu = null; // Variável para controlar qual menu está aberto

    // --- FUNÇÕES AUXILIARES ---

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const closeConversionMenu = () => {
        if (currentOpenMenu) {
            currentOpenMenu.classList.remove('visible');
            currentOpenMenu = null;
        }
    };

    // --- CRIAÇÃO DO MENU DE CONVERSÃO (O POPOVER) ---
    
    const createConversionMenu = () => {
        const menuContainer = document.createElement('div');
        menuContainer.classList.add('conversion-menu-container');

        // Estrutura do menu de categorias e formatos
        menuContainer.innerHTML = `
            <div class="search-bar">
                🔍 <input type="text" placeholder="Busca" id="format-search-input">
            </div>
            <div class="menu-content">
                <ul class="category-list">
                    <li class="category-item active" data-category="image">Imagem</li>
                    <li class="category-item" data-category="document">Documento</li>
                    <li class="category-item" data-category="ebook">EBook</li>
                    <li class="category-item" data-category="font">Fonte</li>
                </ul>
                <div class="format-options-panel">
                    <div class="format-group active" data-formats="image">
                        <button class="format-btn" data-format="png">PNG</button>
                        <button class="format-btn" data-format="jpg">JPG</button>
                        <button class="format-btn" data-format="jpeg">JPEG</button>
                        <button class="format-btn" data-format="svg">SVG</button>
                        <button class="format-btn" data-format="gif">GIF</button>
                    </div>
                    <div class="format-group" data-formats="document">
                        <button class="format-btn" data-format="docx">DOCX</button>
                        <button class="format-btn" data-format="doc">DOC</button>                      
                        <button class="format-btn" data-format="xls">XLS</button>
                        <button class="format-btn" data-format="xlsx">XLSX</button>
                        <button class="format-btn" data-format="ppt">PPT</button>
                        <button class="format-btn" data-format="pptx">PPTX</button>
                        <button class="format-btn" data-format="xml">XML</button>
                        <button class="format-btn" data-format="pdf">PDF</button>
                    </div>
                </div>
            </div>
        `;

        // 1. Lógica de Mudança de Categoria (Manter a navegação por clique)
        const categoryItems = menuContainer.querySelectorAll('.category-item');
        const formatGroups = menuContainer.querySelectorAll('.format-group');
        const formatButtons = menuContainer.querySelectorAll('.format-btn');
        const searchInput = menuContainer.querySelector('#format-search-input');
        
        // Função de clique na categoria
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const selectedCategory = item.dataset.category;

                // Limpa a busca ao mudar de categoria
                searchInput.value = '';
                
                categoryItems.forEach(cat => cat.classList.remove('active'));
                item.classList.add('active');

                // Garante que todos os botões de formato na CATEGORIA ATIVA sejam exibidos
                formatGroups.forEach(group => {
                    group.classList.remove('active');
                    if (group.dataset.formats === selectedCategory) {
                        group.classList.add('active');
                        // Garante que todos os botões dentro do grupo ativo estejam visíveis (após uma possível busca anterior)
                        group.querySelectorAll('.format-btn').forEach(btn => btn.style.display = 'block');
                        group.style.display = 'grid';
                    } else {
                        group.style.display = 'none'; // Esconde grupos inativos
                    }
                });
            });
        });

        // 2. Lógica de Seleção de Formato (Dispara o evento)
        formatButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedFormat = e.currentTarget.dataset.format;
                
                const event = new CustomEvent('formatSelected', { 
                    detail: { 
                        format: selectedFormat, 
                        menuElement: menuContainer 
                    } 
                });
                document.dispatchEvent(event);

                closeConversionMenu(); 
            });
        });
        
        // 3. LÓGICA DE BUSCA E FILTRAGEM
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            // 3.1 Se o termo de busca estiver vazio, volte ao estado normal (ativa a categoria 'image')
            if (searchTerm === '') {
                 menuContainer.querySelector('[data-category="image"]').click();
                 return;
            }

            // Desativa visualmente todas as categorias
            categoryItems.forEach(cat => cat.classList.remove('active'));
            
            // Ativa visualmente todos os grupos de formato para que a busca possa alcançá-los
            formatGroups.forEach(group => group.classList.add('active'));

            let categoriesWithMatch = new Set(); 

            formatButtons.forEach(btn => {
                const formatText = btn.textContent.toLowerCase();
                const category = btn.closest('.format-group').dataset.formats;
                
                // Verifica se o texto do botão de formato corresponde ao termo de busca
                if (formatText.includes(searchTerm)) {
                    btn.style.display = 'block'; 
                    categoriesWithMatch.add(category);

                } else {
                    btn.style.display = 'none'; 
                }
            });
            
            // Ativa as categorias com resultados e esconde os grupos vazios
            formatGroups.forEach(group => {
                const category = group.dataset.formats;
                const visibleButtons = group.querySelectorAll('.format-btn[style="display: block;"]').length;
                
                if (visibleButtons > 0) {
                    group.style.display = 'grid'; 
                    menuContainer.querySelector(`[data-category="${category}"]`).classList.add('active');
                } else {
                    group.style.display = 'none';
                }
            });
        });

        // 4. Ativar a primeira categoria ao criar o menu para garantir o estado inicial
        menuContainer.querySelector('[data-category="image"]').click();

        return menuContainer;
    };


    // --- CRIAÇÃO DO ITEM DE LISTA DE ARQUIVO ---

    const createFileListItem = (file, fileIndex) => {
        const listItem = document.createElement('li');
        listItem.classList.add('file-item');
        listItem.dataset.fileIndex = fileIndex;

        const originalExt = file.name.split('.').pop().toUpperCase();
        
        listItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">Arquivo: ${file.name}</span>
                <span><br></span>
                <span class="file-size">Tamanho: ${formatBytes(file.size)}</span>
                <span><br></span>
                <span class="file-size">Extensão Original: ${originalExt}</span>
            </div>
            <div class="file-actions">
                <button class="btn-format-picker">Converter para...</button>
                <input type="hidden" class="selected-format-input" value="">
                
                <button class="btn-convert" data-filename="${file.name}" data-file-index="${fileIndex}">Converter</button>
                <button class="btn-remove" data-file-index="${fileIndex}">Remover</button>
            </div>
        `;

        // Lógica do botão "Converter para..." (Abre o Menu)
        const formatPickerButton = listItem.querySelector('.btn-format-picker');
        formatPickerButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            closeConversionMenu(); 
            
            let menuElement = listItem.querySelector('.conversion-menu-container');

            if (!menuElement) {
                menuElement = createConversionMenu();
                listItem.appendChild(menuElement);
            }

            menuElement.classList.add('visible');
            currentOpenMenu = menuElement;
        });

        // Lógica de Seleção de Formato (Ouve o evento global 'formatSelected')
        document.addEventListener('formatSelected', (event) => {
            const { format, menuElement } = event.detail;
            
            if (listItem.contains(menuElement)) {
                const inputField = listItem.querySelector('.selected-format-input');
                const pickerButton = listItem.querySelector('.btn-format-picker');
                
                inputField.value = format;
                pickerButton.textContent = `Converter para: ${format.toUpperCase()}`;
            }
        });

        // Lógica do botão "Converter"
        const convertButton = listItem.querySelector('.btn-convert');
        convertButton.addEventListener('click', (event) => {
            const fileName = event.currentTarget.dataset.filename;
            const targetFormat = listItem.querySelector('.selected-format-input').value;
            handleConversion(event, fileName, targetFormat); // Passa o evento para pegar o índice
        });

        // Lógica do botão "Remover"
        const removeButton = listItem.querySelector('.btn-remove');
        removeButton.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.currentTarget.dataset.fileIndex);
            handleRemoval(indexToRemove);
        });

        return listItem;
    };


    // --- FUNÇÕES DE LÓGICA DE APLICAÇÃO (INCLUINDO A GESTÃO DE SLOTS) ---
    
    // Evento de seleção de arquivo
    fileSelector.addEventListener('change', (event) => {
        const files = event.target.files;

        if (files.length > 0) {
            if (placeholder) {
                placeholder.remove();
            }

            for (const file of files) {
                let fileIndex = -1;
                let newItem = null;

                // 1. Tentar encontrar o primeiro slot vazio (null) no array
                fileIndex = selectedFiles.findIndex(f => f === null);

                if (fileIndex !== -1) {
                    // Slot Vago encontrado: Ocupa o slot e insere na posição correta
                    selectedFiles[fileIndex] = file;
                    newItem = createFileListItem(file, fileIndex);

                    // 1.1 Encontrar o elemento <li> visual que deveria estar ANTES deste novo item.
                    let predecessorIndex = -1;
                    // Procura o último elemento não-null antes do índice atual
                    for(let i = fileIndex - 1; i >= 0; i--) {
                        if (selectedFiles[i] !== null) {
                            predecessorIndex = i;
                            break;
                        }
                    }
                    
                    if (predecessorIndex !== -1) {
                        // Se achamos um predecessor visualmente existente, insere o novo item DEPOIS dele
                        const predecessorElement = fileList.querySelector(`[data-file-index="${predecessorIndex}"]`);
                        
                        if (predecessorElement) {
                             predecessorElement.after(newItem);
                        } else {
                            fileList.appendChild(newItem);
                        }
                    } else {
                        // Se não há predecessor, insere como primeiro elemento
                        fileList.prepend(newItem);
                    }


                } else {
                    // Nenhum slot vazio: Adicionar ao final do array e da lista
                    selectedFiles.push(file);
                    fileIndex = selectedFiles.length - 1;
                    newItem = createFileListItem(file, fileIndex);
                    fileList.appendChild(newItem);
                }
            }
        }
        fileSelector.value = '';
    });

    // Lógica de Conversão REAL (Faz uma requisição assíncrona ao servidor backend)
    const handleConversion = async (event, fileName, targetFormat) => {
        if (!targetFormat) {
            alert(`Por favor, selecione um formato de destino para o arquivo "${fileName}".`);
            return;
        }

        // Encontrar o objeto File usando o índice no DOM
        const fileIndex = parseInt(event.currentTarget.closest('.file-item').dataset.fileIndex);
        const fileToConvert = selectedFiles[fileIndex];


        if (!fileToConvert) {
            alert('Erro: Arquivo não encontrado ou já removido.');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileToConvert); 
        formData.append('targetFormat', targetFormat);
        
        document.body.style.cursor = 'wait'; // Feedback visual de carregamento

        try {
            // Requisição para o servidor Node.js na porta 3000
            const response = await fetch('http://localhost:3000/convert', {
                method: 'POST',
                body: formData
            });

            document.body.style.cursor = 'default';

            if (!response.ok) {
                const errorText = await response.text(); // Usa .text() para JSON ou texto
                let errorMessage = `Erro do servidor: ${response.status} ${response.statusText}`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Se não for JSON, usa o texto puro
                    errorMessage = `${errorMessage}. Detalhes: ${errorText.substring(0, 100)}...`;
                }
                
                throw new Error(errorMessage);
            }

            // Inicia o download do arquivo retornado pelo servidor
            const blob = await response.blob();
            
            // Tenta obter o nome do arquivo do cabeçalho de resposta (Content-Disposition)
            const contentDisposition = response.headers.get('Content-Disposition');
            let newFileName = `${fileName.split('.').slice(0, -1).join('.')}.${targetFormat}`;
            
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+?)"/);
                if (match && match[1]) {
                    newFileName = match[1];
                }
            }
            
            // Cria um link temporário para forçar o download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = newFileName;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            alert(`Conversão e download de: ${newFileName} concluídos.`);

        } catch (error) {
            document.body.style.cursor = 'default';
            alert(`Falha na conversão: ${error.message}`);
            console.error('Erro de requisição:', error);
        }
    };

    // Lógica de remoção de arquivo
    const handleRemoval = (indexToRemove) => {
        // 1. Remove o item visualmente
        const itemToRemove = fileList.querySelector(`[data-file-index="${indexToRemove}"]`);
        if (itemToRemove) {
            itemToRemove.remove();
        }

        // 2. Marca o slot como vazio no array de controle
        selectedFiles[indexToRemove] = null; 

        // 3. Verifica se a lista está vazia
        const filesCount = selectedFiles.filter(f => f !== null).length;

        if (filesCount === 0) {
            // Adiciona o placeholder de volta se a lista estiver totalmente vazia
            const newPlaceholder = document.createElement('li');
            newPlaceholder.classList.add('placeholder-item');
            newPlaceholder.textContent = 'Nenhum arquivo selecionado ainda.';
            fileList.appendChild(newPlaceholder);
        }
    };
    
    // Evento global para fechar o menu ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (currentOpenMenu && !currentOpenMenu.contains(e.target) && !e.target.closest('.btn-format-picker')) {
            closeConversionMenu();
        }
    });
});
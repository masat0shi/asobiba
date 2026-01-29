        // Render デプロイ後、YOUR_RENDER_APP_NAME を実際のアプリ名に置き換えてください
        // 例: https://your-app-name.onrender.com
        const API_HOST = window.location.hostname === 'localhost'
            ? 'http://localhost:8080'
            : 'https://collection-api-ljag.onrender.com';
        const API_BASE_URL = `${API_HOST}/api`;
        let currentCollectionId = null;
        let collections = [];
        let items = [];

        // テーマ管理
        const colorThemes = {
            pink: {
                gradient: 'linear-gradient(135deg, #e8a0a0 0%, #d4878a 100%)',
                color: '#d4878a',
                name: 'ピンク'
            },
            blue: {
                gradient: 'linear-gradient(135deg, #7ba3c9 0%, #5b8bb8 100%)',
                color: '#5b8bb8',
                name: 'ブルー'
            },
            green: {
                gradient: 'linear-gradient(135deg, #8fbf9f 0%, #6ba37d 100%)',
                color: '#6ba37d',
                name: 'グリーン'
            },
            purple: {
                gradient: 'linear-gradient(135deg, #a893bd 0%, #8b7aa8 100%)',
                color: '#8b7aa8',
                name: 'パープル'
            },
            orange: {
                gradient: 'linear-gradient(135deg, #e8b87a 0%, #d4a066 100%)',
                color: '#d4a066',
                name: 'オレンジ'
            },
            brown: {
                gradient: 'linear-gradient(135deg, #a89078 0%, #8b7355 100%)',
                color: '#8b7355',
                name: 'ブラウン'
            },
            gray: {
                gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                color: '#6b7280',
                name: 'グレー'
            }
        };

        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            const savedColor = localStorage.getItem('themeColor') || 'pink';
            document.documentElement.setAttribute('data-theme', savedTheme);
            applyColorTheme(savedColor);
            initColorPicker();
        }

        function initColorPicker() {
            const savedColor = localStorage.getItem('themeColor') || 'pink';
            renderSettingsColorPicker(savedColor);
        }

        function renderSettingsColorPicker(activeColor) {
            const container = document.getElementById('settings-color-picker');
            if (!container) return;

            container.innerHTML = '';
            Object.entries(colorThemes).forEach(([key, theme]) => {
                const option = document.createElement('button');
                option.className = 'color-option-large flex flex-col items-center gap-1 p-3 rounded-xl transition-all';
                option.style.cssText = `background: var(--bg-tertiary); border: 2px solid ${key === activeColor ? theme.color : 'transparent'};`;

                option.innerHTML = `
                    <div class="w-10 h-10 rounded-full" style="background: ${theme.gradient};"></div>
                    <span class="text-xs" style="color: var(--text-secondary)">${theme.name}</span>
                `;

                option.onclick = () => {
                    applyColorTheme(key);
                    localStorage.setItem('themeColor', key);
                    renderSettingsColorPicker(key);
                };

                container.appendChild(option);
            });
        }

        function applyColorTheme(colorName) {
            const theme = colorThemes[colorName];
            if (theme) {
                document.documentElement.style.setProperty('--theme-gradient', theme.gradient);
                document.documentElement.style.setProperty('--theme-color', theme.color);
            }
        }

        // 設定モーダル
        function openSettingsModal() {
            const savedColor = localStorage.getItem('themeColor') || 'pink';
            renderSettingsColorPicker(savedColor);
            updateThemeButtons();
            const modal = document.getElementById('settings-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeSettingsModal() {
            const modal = document.getElementById('settings-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateThemeButtons();
        }

        function updateThemeButtons() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const lightBtn = document.getElementById('theme-light-btn');
            const darkBtn = document.getElementById('theme-dark-btn');

            if (lightBtn && darkBtn) {
                lightBtn.style.border = currentTheme === 'light' ? '2px solid var(--theme-color, #d4878a)' : '1px solid var(--border-color)';
                darkBtn.style.border = currentTheme === 'dark' ? '2px solid var(--theme-color, #d4878a)' : '1px solid var(--border-color)';
            }
        }

        // 初期化
        async function init() {
            initTheme();
            await loadCollections();
        }

        // コレクション一覧読み込み
        async function loadCollections() {
            try {
                const response = await fetch(`${API_BASE_URL}/collections`);
                collections = await response.json();
                renderCollections();

                if (collections.length > 0 && !currentCollectionId) {
                    selectCollection(collections[0].id);
                }
            } catch (error) {
                console.error('コレクション読み込みエラー:', error);
            }
        }

        // コレクション表示
        function renderCollections() {
            const container = document.getElementById('collections-selector');
            container.innerHTML = '<button onclick="openCollectionModal()" class="ig-btn px-4 py-2 text-sm rounded-full">＋ 新規作成</button>';

            collections.forEach(collection => {
                const wrapper = document.createElement('div');
                wrapper.className = 'inline-flex items-center group gap-1';

                const tab = document.createElement('button');
                tab.className = 'collection-tab px-4 py-2 text-sm rounded-full font-medium';
                tab.textContent = collection.name;
                tab.onclick = () => selectCollection(collection.id);
                if (collection.id === currentCollectionId) {
                    tab.className = 'collection-tab active px-4 py-2 text-sm rounded-full font-semibold';
                }

                const editBtn = document.createElement('button');
                editBtn.className = 'w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center flex-shrink-0 hover:scale-110';
                editBtn.style.cssText = 'background: var(--bg-tertiary); border: 1px solid var(--border-color);';
                editBtn.textContent = '✎';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    openCollectionEditModal(collection.id);
                };

                wrapper.appendChild(tab);
                wrapper.appendChild(editBtn);
                container.appendChild(wrapper);
            });
        }

        // コレクション編集モーダル
        function openCollectionEditModal(id) {
            const collection = collections.find(c => c.id === id);
            if (!collection) return;

            document.getElementById('collection-modal-title').textContent = 'コレクション編集';
            document.getElementById('collection-id').value = collection.id;
            document.getElementById('collection-name').value = collection.name;
            document.getElementById('collection-description').value = collection.description || '';

            // 削除ボタンを表示
            document.getElementById('collection-delete-btn').classList.remove('hidden');

            const modal = document.getElementById('collection-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // コレクション選択
        async function selectCollection(id) {
            currentCollectionId = id;
            renderCollections();
            await loadItems();
            await loadStats();
        }

        // アイテム一覧読み込み
        async function loadItems() {
            if (!currentCollectionId) return;

            try {
                const response = await fetch(`${API_BASE_URL}/collections/${currentCollectionId}/items`);
                items = await response.json();
                renderItems(items);
            } catch (error) {
                console.error('アイテム読み込みエラー:', error);
            }
        }

        // アイテム表示（Instagram風グリッド）
        function renderItems(itemsToRender) {
            const container = document.getElementById('items-grid');

            if (itemsToRender.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-16">
                        <div class="text-6xl mb-4">✨</div>
                        <div class="text-lg" style="color: var(--text-secondary)">アイテムがありません</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-2 md:grid-cols-3 gap-4';

            itemsToRender.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';

                // 画像表示の処理
                let imageHTML;
                if (item.image_url) {
                    imageHTML = `<div class="item-image"><img src="${API_HOST}${item.image_url}" alt="${item.name}"></div>`;
                } else {
                    imageHTML = `<div class="item-image flex items-center justify-center text-5xl">📦</div>`;
                }

                card.innerHTML = `
                    <div class="item-clickable" onclick="showItemDetail(${item.id})">
                        ${imageHTML}
                        <div class="item-info-display">
                            <div class="text-sm font-semibold truncate mb-1" title="${item.name}">${item.name}</div>
                            ${item.price ? `<div class="text-sm font-bold ig-gradient-text">¥${formatPrice(item.price)}</div>` : ''}
                        </div>
                    </div>
                    <div class="item-actions-bottom">
                        <button onclick="event.stopPropagation(); editItem(${item.id})" class="ig-btn-secondary w-full">編集</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            container.appendChild(grid);
        }

        // 統計読み込み
        async function loadStats() {
            if (!currentCollectionId) return;

            try {
                const response = await fetch(`${API_BASE_URL}/collections/${currentCollectionId}/stats`);
                const stats = await response.json();
                document.getElementById('total-items').textContent = stats.total_items;
                document.getElementById('total-price').textContent = `¥${formatPrice(stats.total_price)}`;
            } catch (error) {
                console.error('統計読み込みエラー:', error);
            }
        }

        // 検索
        document.getElementById('search-box').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = items.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.memo && item.memo.toLowerCase().includes(query))
            );
            renderItems(filtered);
        });

        // 画像プレビュー
        function previewImage(event) {
            const file = event.target.files[0];
            const fileLabel = document.getElementById('file-label');

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('image-preview');
                    const img = document.getElementById('preview-img');
                    img.src = e.target.result;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
                fileLabel.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
            } else {
                fileLabel.textContent = '画像を選択';
            }
        }

        // 画像アップロード
        async function uploadImage(file) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.image_url;
                } else {
                    throw new Error('画像のアップロードに失敗しました');
                }
            } catch (error) {
                console.error('画像アップロードエラー:', error);
                alert('画像のアップロードに失敗しました: ' + error.message);
                return null;
            }
        }

        // コレクションモーダル（新規作成）
        function openCollectionModal() {
            document.getElementById('collection-modal-title').textContent = '新しいコレクション';
            document.getElementById('collection-id').value = '';
            document.getElementById('collection-name').value = '';
            document.getElementById('collection-description').value = '';

            // 削除ボタンを非表示
            document.getElementById('collection-delete-btn').classList.add('hidden');

            const modal = document.getElementById('collection-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeCollectionModal() {
            const modal = document.getElementById('collection-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('collection-form').reset();
        }

        async function saveCollection(e) {
            e.preventDefault();

            const collectionId = document.getElementById('collection-id').value;
            const data = {
                name: document.getElementById('collection-name').value,
                description: document.getElementById('collection-description').value
            };

            try {
                const url = collectionId ? `${API_BASE_URL}/collections/${collectionId}` : `${API_BASE_URL}/collections`;
                const method = collectionId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    closeCollectionModal();
                    await loadCollections();
                } else {
                    alert('保存に失敗しました: ' + response.statusText);
                }
            } catch (error) {
                console.error('コレクション保存エラー:', error);
                alert('エラーが発生しました: ' + error.message);
            }
        }

        // コレクション削除（モーダル内から）
        async function deleteCurrentCollection() {
            const collectionId = document.getElementById('collection-id').value;
            const collectionName = document.getElementById('collection-name').value;

            if (!collectionId) return;

            if (!confirm(`コレクション「${collectionName}」を削除しますか？\n※ 含まれるアイテムも全て削除されます`)) return;

            try {
                const response = await fetch(`${API_BASE_URL}/collections/${collectionId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    if (currentCollectionId === parseInt(collectionId)) {
                        currentCollectionId = null;
                    }
                    closeCollectionModal();
                    await loadCollections();
                } else {
                    alert('削除に失敗しました: ' + response.statusText);
                }
            } catch (error) {
                console.error('コレクション削除エラー:', error);
                alert('エラーが発生しました: ' + error.message);
            }
        }

        // アイテムモーダル
        function openItemModal() {
            if (!currentCollectionId) {
                alert('先にコレクションを選択してください');
                return;
            }
            document.getElementById('item-modal-title').textContent = '新しいアイテム';
            document.getElementById('item-form').reset();
            document.getElementById('item-id').value = '';
            document.getElementById('item-image-url').value = '';
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('file-label').textContent = '画像を選択';

            // 削除ボタンを非表示
            document.getElementById('item-delete-btn').classList.add('hidden');

            const modal = document.getElementById('item-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeItemModal() {
            const modal = document.getElementById('item-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('item-form').reset();
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('item-image-url').value = '';
        }

        async function saveItem(e) {
            e.preventDefault();
            console.log('saveItem called');

            // 画像ファイルが選択されている場合、先にアップロード
            const imageFile = document.getElementById('item-image').files[0];
            let imageUrl = document.getElementById('item-image-url').value || null;

            if (imageFile) {
                console.log('画像をアップロード中...');
                imageUrl = await uploadImage(imageFile);
                if (!imageUrl) {
                    return; // アップロード失敗時は処理を中断
                }
            }

            const itemId = document.getElementById('item-id').value;
            const data = {
                collection_id: currentCollectionId,
                name: document.getElementById('item-name').value,
                image_url: imageUrl,
                purchase_date: document.getElementById('item-purchase-date').value || null,
                price: parseFloat(document.getElementById('item-price').value) || null,
                memo: document.getElementById('item-memo').value || null
            };

            console.log('送信データ:', data);

            try {
                const url = itemId ? `${API_BASE_URL}/items/${itemId}` : `${API_BASE_URL}/items`;
                const method = itemId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });

                console.log('レスポンス:', response);

                if (response.ok) {
                    const result = await response.json();
                    console.log('保存成功:', result);
                    //alert('アイテムを保存しました！');
                    closeItemModal();
                    await loadItems();
                    await loadStats();
                } else {
                    alert('保存に失敗しました: ' + response.statusText);
                }
            } catch (error) {
                console.error('アイテム保存エラー:', error);
                alert('エラーが発生しました: ' + error.message);
            }
        }

        // アイテム詳細表示
        function showItemDetail(id) {
            const item = items.find(i => i.id === id);
            if (!item) return;

            document.getElementById('detail-name').textContent = item.name;
            document.getElementById('detail-date').textContent = item.purchase_date ? formatDate(item.purchase_date) : '-';

            const priceEl = document.getElementById('detail-price');
            priceEl.textContent = item.price ? `¥${formatPrice(item.price)}` : '-';

            document.getElementById('detail-memo').textContent = item.memo || 'メモなし';

            const detailImage = document.getElementById('detail-image');
            if (item.image_url) {
                detailImage.src = API_HOST + item.image_url;
                detailImage.classList.remove('hidden');
            } else {
                detailImage.classList.add('hidden');
            }

            const modal = document.getElementById('detail-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeDetailModal() {
            const modal = document.getElementById('detail-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        async function editItem(id) {
            const item = items.find(i => i.id === id);
            if (!item) return;

            document.getElementById('item-modal-title').textContent = 'アイテム編集';
            document.getElementById('item-id').value = item.id;
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-purchase-date').value = item.purchase_date ? item.purchase_date.split('T')[0] : '';
            document.getElementById('item-price').value = item.price || '';
            document.getElementById('item-memo').value = item.memo || '';

            // 既存の画像を表示
            if (item.image_url) {
                document.getElementById('item-image-url').value = item.image_url;
                const preview = document.getElementById('image-preview');
                const img = document.getElementById('preview-img');
                img.src = API_HOST + item.image_url;
                preview.classList.remove('hidden');
                document.getElementById('file-label').textContent = '画像を変更';
            } else {
                document.getElementById('item-image-url').value = '';
                document.getElementById('image-preview').classList.add('hidden');
                document.getElementById('file-label').textContent = '画像を選択';
            }

            // 削除ボタンを表示
            document.getElementById('item-delete-btn').classList.remove('hidden');

            const modal = document.getElementById('item-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // アイテム削除（モーダル内から）
        async function deleteCurrentItem() {
            const itemId = document.getElementById('item-id').value;
            const itemName = document.getElementById('item-name').value;

            if (!itemId) return;

            if (!confirm(`「${itemName}」を削除しますか？`)) return;

            try {
                const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    closeItemModal();
                    await loadItems();
                    await loadStats();
                } else {
                    alert('削除に失敗しました: ' + response.statusText);
                }
            } catch (error) {
                console.error('アイテム削除エラー:', error);
                alert('エラーが発生しました: ' + error.message);
            }
        }

        // ユーティリティ
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP');
        }

        function formatPrice(price) {
            return new Intl.NumberFormat('ja-JP').format(price);
        }

        // 初期化実行
        init();

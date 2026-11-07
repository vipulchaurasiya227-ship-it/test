const state = { photos: [], size: 'a4', orientation: 'portrait' };
const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const grid = document.querySelector('#photo-grid');
const emptyState = document.querySelector('#empty-state');
const clearButton = document.querySelector('#clear-button');
const downloadButton = document.querySelector('#download-button');

function addFiles(files) {
  const images = [...files].filter(file => file.type.startsWith('image/')).slice(0, 30 - state.photos.length);
  images.forEach(file => state.photos.push({ file, url: URL.createObjectURL(file) }));
  render();
}
function render() {
  const count = state.photos.length;
  document.querySelector('#photo-count').textContent = count;
  document.querySelector('#page-count').textContent = count;
  emptyState.hidden = count > 0;
  document.querySelector('#queue-hint').hidden = count === 0;
  clearButton.disabled = count === 0;
  downloadButton.disabled = count === 0;
  grid.innerHTML = state.photos.map((photo, index) => `<article class="photo-card" draggable="true" data-index="${index + 1}" data-position="${index}"><img src="${photo.url}" alt="Photo ${index + 1}"><button class="remove-photo" type="button" aria-label="Remove photo ${index + 1}">&times;</button></article>`).join('');
  grid.querySelectorAll('.remove-photo').forEach((button, index) => button.addEventListener('click', () => { URL.revokeObjectURL(state.photos[index].url); state.photos.splice(index, 1); render(); }));
  grid.querySelectorAll('.photo-card').forEach(card => {
    card.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', card.dataset.position); card.style.opacity = '.4'; });
    card.addEventListener('dragend', () => { card.style.opacity = '1'; });
    card.addEventListener('dragover', event => event.preventDefault());
    card.addEventListener('drop', event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); const to = Number(card.dataset.position); const [moved] = state.photos.splice(from, 1); state.photos.splice(to, 0, moved); render(); });
  });
}
fileInput.addEventListener('change', event => addFiles(event.target.files));
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
clearButton.addEventListener('click', () => { state.photos.forEach(photo => URL.revokeObjectURL(photo.url)); state.photos = []; render(); });
document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => { state.size = button.dataset.size; document.querySelectorAll('[data-size]').forEach(item => item.classList.toggle('active', item === button)); }));
document.querySelectorAll('[data-orientation]').forEach(button => button.addEventListener('click', () => { state.orientation = button.dataset.orientation; document.querySelectorAll('[data-orientation]').forEach(item => item.classList.toggle('active', item === button)); }));
async function loadImage(url) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; }); }
downloadButton.addEventListener('click', async () => {
  if (!window.jspdf || !state.photos.length) return;
  downloadButton.disabled = true;
  downloadButton.querySelector('span').textContent = 'Preparing...';
  const pdf = new window.jspdf.jsPDF({ orientation: state.orientation, unit: 'mm', format: state.size === 'fit' ? 'a4' : state.size });
  for (let index = 0; index < state.photos.length; index += 1) {
    if (index) pdf.addPage(state.size === 'fit' ? 'a4' : state.size, state.orientation);
    const image = await loadImage(state.photos[index].url);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / image.width, pageHeight / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    pdf.addImage(image, 'JPEG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST');
  }
  pdf.save('papertrail.pdf');
  downloadButton.disabled = false;
  downloadButton.querySelector('span').textContent = 'Make PDF';
});
render();
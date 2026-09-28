import { useEffect, useMemo, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from './services/productService';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

const emptyProduct = { name: '', sku: '', price: '', quantity: '' };

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [productRows, setProductRows] = useState([emptyProduct]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts();
      setProducts(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not connect to the inventory service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => !term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term));
  }, [products, search]);

  const totalUnits = products.reduce((total, product) => total + Number(product.quantity || 0), 0);
  const inventoryValue = products.reduce((total, product) => total + Number(product.price || 0) * Number(product.quantity || 0), 0);
  const lowStock = products.filter((product) => Number(product.quantity) < 10).length;
  const outOfStock = products.filter((product) => Number(product.quantity) === 0).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const payload = { ...form, price: Number(form.price), quantity: Number(form.quantity) };
        await updateProduct(editingId, payload);
      } else {
        const payloads = productRows.map((product) => ({ ...product, price: Number(product.price), quantity: Number(product.quantity) }));
        await Promise.all(payloads.map((payload) => createProduct(payload)));
      }
      setForm(emptyProduct);
      setProductRows([emptyProduct]);
      setEditingId(null);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The product could not be saved.');
    } finally { setSaving(false); }
  };

  const beginEdit = (product) => {
    setEditingId(product._id);
    setForm({ name: product.name, sku: product.sku, price: product.price, quantity: product.quantity });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateProductRow = (index, field, value) => {
    setProductRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const addProductRow = () => setProductRows((rows) => [...rows, { ...emptyProduct }]);

  const removeProductRow = (index) => setProductRows((rows) => rows.length === 1 ? rows : rows.filter((_, rowIndex) => rowIndex !== index));

  const removeProduct = async (id) => {
    if (!window.confirm('Remove this product from inventory?')) return;
    try { await deleteProduct(id); await loadProducts(); }
    catch (requestError) { setError(requestError.response?.data?.message || 'The product could not be removed.'); }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark"><Inventory2OutlinedIcon /></span><span>Inventory ManagementSystem</span></a>
        <nav className="main-nav" aria-label="Primary navigation"><a className="active" href="#inventory">Inventory</a><a href="#add-product">Add product</a></nav>
        <div className="profile"><span className="profile-avatar">A</span><span className="profile-name">Admin</span></div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">INVENTORY OVERVIEW</p><h1>Welcome to<br /><em>Stock Management.</em></h1><p className="hero-copy">Keep your catalog accurate and your inventory moving with confidence.</p></div>
        <div className="hero-note"><span>Catalog health</span><strong>{products.length.toString().padStart(2, '0')} <small>products tracked</small></strong><div className="health-line"><i style={{ width: `${products.length ? Math.max(18, ((products.length - outOfStock) / products.length) * 100) : 18}%` }} /></div></div>
      </section>

      <section className="metrics" aria-label="Inventory overview">
        <article><span>Total units</span><strong>{totalUnits.toLocaleString()}</strong><small>Across all products</small></article>
        <article><span>Inventory value</span><strong>{formatCurrency(inventoryValue)}</strong><small>Current stock at cost</small></article>
        <article className={lowStock ? 'attention' : ''}><span>Low stock</span><strong>{lowStock.toString().padStart(2, '0')}</strong><small>{lowStock ? 'Needs attention' : 'Everything looks good'}</small></article>
      </section>

      <section className="workspace" id="inventory">
        <div className="workspace-head"><div><p className="eyebrow">CATALOG</p><h2>Products</h2></div><span className="count-label">{filteredProducts.length} showing</span></div>
        {error && <div className="alert" role="alert">{error}<button onClick={loadProducts}>Retry</button></div>}
        <div className="toolbar"><label className="search"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products by name or SKU..." /></label><button className={`secondary ${loading ? 'is-loading' : ''}`} onClick={loadProducts}><RefreshIcon /> Refresh</button></div>
        <div className="table-wrap">
          <table><thead><tr><th>Product</th><th>SKU</th><th>Unit price</th><th>Quantity</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="6" className="empty">Loading inventory...</td></tr> : filteredProducts.length === 0 ? <tr><td colSpan="6" className="empty"><div className="empty-icon"><Inventory2OutlinedIcon /></div><strong>{search ? 'No products found' : 'Your inventory is empty'}</strong><span>{search ? 'Try another product name or SKU.' : 'Start building your catalog by adding your first product.'}</span>{!search && <button className="empty-action" onClick={() => document.getElementById('add-product')?.scrollIntoView({ behavior: 'smooth' })}><AddIcon /> Add Product</button>}</td></tr> : filteredProducts.map((product) => { const quantity = Number(product.quantity); const status = quantity === 0 ? 'Out of stock' : quantity < 10 ? 'Low stock' : 'In stock'; return <tr key={product._id}><td className="product-name"><span className="product-icon">{product.name.charAt(0).toUpperCase()}</span><strong>{product.name}</strong></td><td className="muted">{product.sku}</td><td>{formatCurrency(product.price)}</td><td>{quantity}</td><td><span className={`status ${quantity === 0 ? 'out' : quantity < 10 ? 'low' : 'healthy'}`}>{status}</span></td><td className="actions"><button title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => beginEdit(product)}><EditOutlinedIcon /></button><button title="Delete product" aria-label={`Delete ${product.name}`} className="delete" onClick={() => removeProduct(product._id)}><DeleteOutlineIcon /></button></td></tr>; })}</tbody>
          </table>
        </div>
      </section>

      <section className="add-panel" id="add-product"><div className="add-intro"><span className="add-icon"><AddIcon /></span><p className="eyebrow">{editingId ? 'EDIT PRODUCT' : 'NEW ENTRY'}</p><h2>{editingId ? 'Update product' : 'Add a new product'}</h2><p>Keep your catalog accurate and your inventory up to date.</p></div><form onSubmit={handleSubmit}>{editingId ? <div className="product-entry-grid"><label>Product Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ceramic Travel Mug" /></label><label>SKU<input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. MUG-204" /></label><label>Price<input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="₹ 0.00" /></label><label>Quantity<input required min="0" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></label></div> : <div className="product-entries">{productRows.map((row, index) => <div className="product-entry" key={`product-row-${index}`}><div className="product-entry-number">{index + 1}</div><label>Product Name<input required value={row.name} onChange={(e) => updateProductRow(index, 'name', e.target.value)} placeholder="e.g. Ceramic Travel Mug" /></label><label>SKU<input required value={row.sku} onChange={(e) => updateProductRow(index, 'sku', e.target.value)} placeholder="e.g. MUG-204" /></label><label>Price<input required min="0" step="0.01" type="number" value={row.price} onChange={(e) => updateProductRow(index, 'price', e.target.value)} placeholder="₹ 0.00" /></label><label>Quantity<input required min="0" type="number" value={row.quantity} onChange={(e) => updateProductRow(index, 'quantity', e.target.value)} placeholder="0" /></label>{productRows.length > 1 && <button type="button" className="remove-row" onClick={() => removeProductRow(index)} aria-label={`Remove product row ${index + 1}`}>×</button>}</div>)}</div>}<div className="form-actions"><button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : `Add ${productRows.length} product${productRows.length === 1 ? '' : 's'}`} <ArrowForwardIcon /></button>{!editingId && <button type="button" className="add-row" onClick={addProductRow}><AddIcon /> Add another</button>}{editingId && <button type="button" className="cancel" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>Cancel</button>}</div></form></section>
      <footer><span>INVENTORY MANAGEMENTSYSTEM</span><span>Inventory, made visible.</span></footer>
    </main>
  );
}

export default App;

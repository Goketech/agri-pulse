"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";

interface Listing {
  id: string;
  equipmentName: string;
  description: string;
  condition: string;
  price: number;
  transactionType: string;
  region: string;
  isVerified: boolean;
  ownerName: string;
  ownerId: string;
  distance?: number;
  createdAt: string;
}

export default function MarketplacePage() {
  const { isAuthenticated, user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState({
    equipmentName: "",
    description: "",
    condition: "good",
    price: "",
    transactionType: "sale",
    latitude: "",
    longitude: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchListings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await apiFetch(`/marketplace/listings?${params}`);
      const data = await res.json();
      if (res.ok) setListings(data.listings);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchListings();
  }, [isAuthenticated]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await apiFetch("/marketplace/listings", {
        method: "POST",
        body: JSON.stringify({
          equipmentName: form.equipmentName,
          description: form.description,
          condition: form.condition,
          price: parseFloat(form.price),
          transactionType: form.transactionType,
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Failed to create listing");
      } else {
        setShowForm(false);
        setForm({ equipmentName: "", description: "", condition: "good", price: "", transactionType: "sale", latitude: "", longitude: "" });
        fetchListings();
      }
    } catch {
      setFormError("Network error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing?")) return;
    await apiFetch(`/marketplace/listings/${id}`, { method: "DELETE" });
    fetchListings();
  }

  async function handlePay(id: string) {
    try {
      const res = await apiFetch(`/marketplace/listings/${id}/pay`, { method: "POST" });
      const data = await res.json();
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank");
      } else {
        alert(data.message || "Payment initiated");
      }
    } catch {
      alert("Payment failed");
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-lg font-semibold">P2P Marketplace</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please log in to browse and list equipment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">P2P Marketplace</h2>
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder="Search equipment..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchListings()}
          />
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); }}
          >
            <option value="">All types</option>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
          <button onClick={fetchListings} className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            Search
          </button>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400"
        >
          {showForm ? "Cancel" : "+ List Item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Equipment name</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                value={form.equipmentName}
                onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Price</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Condition</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Type</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                value={form.transactionType}
                onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
              >
                <option value="sale">For sale</option>
                <option value="rent">For rent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300">Latitude (optional)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Longitude (optional)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand-400">
            Create Listing
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <LoadingSpinner label="Loading marketplace listings..." />
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-sm text-slate-500">No listings yet. Be the first to list equipment!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((l) => (
            <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">{l.equipmentName}</h3>
                  {l.isVerified && (
                    <span className="mt-0.5 inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                      Verified
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {l.transactionType === "rent" ? "Rent" : "Sale"}
                </span>
              </div>
              {l.description && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{l.description}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {l.region === "NG" ? "NGN" : "RWF"}{" "}
                  {l.price.toLocaleString()} · {l.condition} · by {l.ownerName}
                </span>
                {l.distance !== undefined && <span>{l.distance.toFixed(1)} km</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handlePay(l.id)}
                  className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-brand-400"
                >
                  {l.transactionType === "rent" ? "Rent Now" : "Buy Now"}
                </button>
                {user?.role === "admin" && !l.isVerified && (
                  <button
                    onClick={async () => {
                      await apiFetch(`/marketplace/listings/${l.id}/verify`, { method: "PATCH" });
                      fetchListings();
                    }}
                    className="rounded-md border border-brand-500 px-3 py-1 text-xs text-brand-400 hover:bg-brand-500/10"
                  >
                    Verify
                  </button>
                )}
                <button
                  onClick={() => handleDelete(l.id)}
                  className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:border-red-500 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

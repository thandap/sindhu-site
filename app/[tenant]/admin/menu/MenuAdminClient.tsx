
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";

type MenuItem = {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    isVegetarian: boolean;
    isVegan: boolean;
    priceCents: number;
    isActive: boolean;
    isAvailable: boolean;
};

type MenuCategory = {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    items: MenuItem[];
    isActive: boolean;
};

type Props = {
    restaurantName: string;
    categories: MenuCategory[];
};

type ItemForm = {
    name: string;
    description: string;
    price: string;
    categoryId: string;
    isActive: boolean;
    isVegetarian: boolean;
    isVegan: boolean;
};

const emptyItem: ItemForm = {
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isActive: false,
    isVegetarian: false,
    isVegan: false,
};

export default function MenuAdminClient({
    restaurantName,
    categories,
}: Props) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] =
        useState("all");
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [categoryName, setCategoryName] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        null
    );
    const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [photoBusy, setPhotoBusy] = useState(false);

    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [bulkBusy, setBulkBusy] = useState(false);

    const [destinationCategoryId, setDestinationCategoryId] =
        useState<string>("");
    const [categoryOrders, setCategoryOrders] = useState<
        Record<string, number>
    >(() =>
        Object.fromEntries(
            categories.map((category) => [
                category.id,
                category.sortOrder,
            ])
        )
    );

    const [orderSaving, setOrderSaving] = useState(false);
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredCategories = categories
        .filter(
            (category) =>
                selectedCategoryFilter === "all" ||
                category.id === selectedCategoryFilter
        )
        .map((category) => ({
            ...category,
            items: category.items.filter((item) => {
                if (!normalizedSearch) return true;

                return (
                    item.name.toLowerCase().includes(normalizedSearch) ||
                    (item.description ?? "")
                        .toLowerCase()
                        .includes(normalizedSearch)
                );
            }),
        }))
        .filter(
            (category) =>
                !normalizedSearch || category.items.length > 0
        );

    const matchingItemCount = filteredCategories.reduce(
        (total, category) => total + category.items.length,
        0
    );


    async function saveAllCategoryOrders() {
        const orders = categories.map((category) => ({
            id: category.id,
            sortOrder: categoryOrders[category.id],
        }));

        if (
            orders.some(
                (entry) =>
                    !Number.isInteger(entry.sortOrder) ||
                    entry.sortOrder < 1
            )
        ) {
            setError("All category orders must be positive whole numbers.");
            return;
        }

        const numbers = orders.map((entry) => entry.sortOrder);

        if (new Set(numbers).size !== numbers.length) {
            setError("Each category must have a unique display order.");
            return;
        }

        setOrderSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                "/api/admin/menu/categories/bulk-order",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ orders }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to save category orders"
                );
            }

            setSuccess("All category orders saved successfully.");
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save category orders"
            );
        } finally {
            setOrderSaving(false);
        }
    }

    function resetRecommendedCategoryOrders() {
        const recommended = [
            "Appetizers & Tandoori",
            "Chicken Entrees",
            "Lamb & Goat Entrees",
            "Seafood Entrees",
            "Vegetarian Entrees",
            "Biryani & Rice",
            "Indo-Chinese",
            "Breads",
            "Soups & Salads",
            "Sides & Extras",
            "Desserts",
            "Beverages",
        ];

        const nextOrders: Record<string, number> = {};

        categories.forEach((category) => {
            const position = recommended.indexOf(category.name);

            nextOrders[category.id] =
                position >= 0
                    ? position + 1
                    : recommended.length +
                    categories.findIndex((c) => c.id === category.id) +
                    1;
        });

        setCategoryOrders(nextOrders);
        setError("");
        setSuccess("Recommended order loaded. Click Save All Orders to apply.");
    }

    useEffect(() => {
        if (!photoFile) {
            setPhotoPreview(null);
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    function resetPhotoState() {
        setPhotoFile(null);
        setCurrentPhoto(null);
    }

    function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Choose a JPG, PNG, or WebP picture.");
            return;
        }
        if (file.size > 5 * 1024 * 1024 || file.size === 0) {
            setError("Choose a picture smaller than 5 MB.");
            return;
        }
        setError("");
        setPhotoFile(file);
    }

    async function uploadPhoto() {
        if (!editingItemId || !photoFile || photoBusy || saving) return;
        setPhotoBusy(true);
        setError("");
        setSuccess("");
        try {
            const form = new FormData();
            form.append("file", photoFile);
            const response = await fetch(
                `/api/admin/menu/items/${encodeURIComponent(editingItemId)}/image`,
                { method: "POST", body: form }
            );
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Photo upload failed");
            setCurrentPhoto(result.image);
            setPhotoFile(null);
            setSuccess("Dish picture uploaded successfully.");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Photo upload failed");
        } finally {
            setPhotoBusy(false);
        }
    }

    async function removePhoto() {
        if (!editingItemId || !currentPhoto || photoBusy || saving) return;
        if (!window.confirm("Remove this dish picture?")) return;
        setPhotoBusy(true);
        setError("");
        setSuccess("");
        try {
            const response = await fetch(
                `/api/admin/menu/items/${encodeURIComponent(editingItemId)}/image`,
                { method: "DELETE" }
            );
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Unable to remove photo");
            setCurrentPhoto(null);
            setPhotoFile(null);
            setSuccess("Dish picture removed successfully.");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to remove photo");
        } finally {
            setPhotoBusy(false);
        }
    }

    function updateItem<K extends keyof ItemForm>(
        field: K,
        value: ItemForm[K]
    ) {
        setItemForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function openItemForm(categoryId: string) {
        const closing = selectedCategoryId === categoryId;
        setSelectedCategoryId(closing ? null : categoryId);
        setEditingItemId(null);
        setItemForm({ ...emptyItem });
        resetPhotoState();
        setShowCategoryForm(false);
        setError("");
        setSuccess("");
    }

    function editItem(item: MenuItem, categoryId: string) {
        setSelectedCategoryId(categoryId);
        setEditingItemId(item.id);
        setPhotoFile(null);
        setCurrentPhoto(item.image);
        setItemForm({
            name: item.name,
            description: item.description ?? "",
            price: (item.priceCents / 100).toFixed(2),
            categoryId,
            isActive: item.isActive,
            isVegetarian: item.isVegetarian,
            isVegan: item.isVegan,
        });
        setShowCategoryForm(false);
        setError("");
        setSuccess("");
    }

    async function sendJson(
        url: string,
        data: Record<string, unknown>
    ) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
            throw new Error(
                `Server returned HTTP ${response.status} instead of JSON`
            );
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save");
        }

        return result;
    }

    async function addCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = categoryName.trim();
        if (!name || saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            await sendJson("/api/admin/menu/categories", { name });

            setCategoryName("");
            setShowCategoryForm(false);
            setSuccess(`Category "${name}" created successfully.`);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to create category"
            );
        } finally {
            setSaving(false);
        }
    }

    async function addItem(
        event: FormEvent<HTMLFormElement>,
        categoryId: string
    ) {
        event.preventDefault();

        if (saving) return;

        const name = itemForm.name.trim();
        const price = itemForm.price.trim();

        if (!name || !price) {
            setError("Item name and price are required.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            await sendJson("/api/admin/menu/items", {
                categoryId,
                name,
                description: itemForm.description,
                price,
                isVegetarian: itemForm.isVegetarian,
                isVegan: itemForm.isVegan,
            });

            setItemForm({ ...emptyItem });
            setSelectedCategoryId(null);
            setSuccess(`Menu item "${name}" created successfully.`);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to create item"
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveItemChanges(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingItemId || saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/admin/menu/items/${encodeURIComponent(editingItemId)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: itemForm.name.trim(),
                        description: itemForm.description.trim(),
                        price: itemForm.price.trim(),
                        categoryId: itemForm.categoryId,
                        isActive: itemForm.isActive,
                        isVegetarian: itemForm.isVegetarian,
                        isVegan: itemForm.isVegan,
                    }),
                }
            );
            if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
                throw new Error(`Server returned HTTP ${response.status} instead of JSON`);
            }
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Unable to update item");

            setSuccess(`Menu item "${itemForm.name.trim()}" updated successfully.`);
            setEditingItemId(null);
            setSelectedCategoryId(null);
            setItemForm({ ...emptyItem });
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to update item");
        } finally {
            setSaving(false);
        }
    }
    async function toggleAvailability(item: MenuItem) {
        if (saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/admin/menu/items/${encodeURIComponent(item.id)}/availability`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        isAvailable: !item.isAvailable,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to update availability");
            }

            setSuccess(
                `${item.name} marked as ${result.isAvailable ? "Available" : "Sold Out"
                }.`
            );

            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update availability"
            );
        } finally {
            setSaving(false);
        }
    }

    async function toggleCategoryActive(
        categoryId: string,
        currentStatus: boolean
    ) {
        try {
            const response = await fetch(
                `/api/admin/menu/categories/${categoryId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        isActive: !currentStatus,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to update category");
            }

            window.location.reload();
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to update category"
            );
        }
    }

    function toggleItemSelection(itemId: string) {
        setSelectedItemIds((previous) =>
            previous.includes(itemId)
                ? previous.filter((id) => id !== itemId)
                : [...previous, itemId]
        );
    } async function updateCategoryOrder(
        categoryId: string,
        sortOrder: number
    ) {
        if (!Number.isInteger(sortOrder) || sortOrder < 1) {
            setError("Please enter a valid display order.");
            return;
        }

        try {
            setError("");
            setSuccess("");

            const response = await fetch(
                `/api/admin/menu/categories/${categoryId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ sortOrder }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to update category order"
                );
            }

            window.location.reload();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to update category order"
            );
        }
    }

    function toggleSelectAllFiltered() {
        const visibleIds = filteredCategories.flatMap((category) =>
            category.items.map((item) => item.id)
        );

        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedItemIds.includes(id));

        setSelectedItemIds((previous) =>
            allSelected
                ? previous.filter((id) => !visibleIds.includes(id))
                : [...new Set([...previous, ...visibleIds])]
        );
    }
    async function bulkUpdateItems(isActive: boolean) {
        if (selectedItemIds.length === 0 || bulkBusy) return;

        const action = isActive ? "publish" : "hide";

        if (
            !window.confirm(
                `Are you sure you want to ${action} ${selectedItemIds.length} selected menu items?`
            )
        ) {
            return;
        }

        setBulkBusy(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/admin/menu/items/bulk", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    itemIds: selectedItemIds,
                    isActive,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Bulk update failed");
            }

            setSuccess(
                `${result.updatedCount} menu items ${isActive ? "published" : "hidden"
                } successfully.`
            );

            setSelectedItemIds([]);
            router.refresh();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to update menu items"
            );
        } finally {
            setBulkBusy(false);
        }
    }

    async function bulkMoveItems() {
        if (
            selectedItemIds.length === 0 ||
            !destinationCategoryId ||
            bulkBusy
        ) {
            return;
        }

        const destination = categories.find(
            (category) => category.id === destinationCategoryId
        );

        if (!destination) {
            setError("Please select a valid category.");
            return;
        }

        const confirmed = window.confirm(
            `Move ${selectedItemIds.length} selected dishes to "${destination.name}"?`
        );

        if (!confirmed) return;

        setBulkBusy(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                "/api/admin/menu/items/bulk",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "move",
                        itemIds: selectedItemIds,
                        categoryId: destinationCategoryId,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to move menu items"
                );
            }

            setSuccess(
                `${result.updatedCount} menu items moved to "${destination.name}" successfully.`
            );

            setSelectedItemIds([]);
            setDestinationCategoryId("");

            router.refresh();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to move menu items"
            );
        } finally {
            setBulkBusy(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Menu Management</h1>
                        <p className="mt-2 text-slate-600">{restaurantName}</p>
                    </div>
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={resetRecommendedCategoryOrders}
                            disabled={orderSaving}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
                        >
                            Reset to Recommended Order
                        </button>

                        <button
                            type="button"
                            onClick={saveAllCategoryOrders}
                            disabled={orderSaving}
                            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {orderSaving ? "Saving Orders..." : "Save All Orders"}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setShowCategoryForm(!showCategoryForm);
                            setSelectedCategoryId(null);
                            setEditingItemId(null);
                            setItemForm({ ...emptyItem });
                            setError("");
                            setSuccess("");
                        }}
                        className="rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800"
                    >
                        {showCategoryForm ? "Cancel" : "+ Add Category"}
                    </button>
                </div>

                {/* Search Menu Items and Category Filter */}
                <div className="mt-6 mb-6 space-y-4">

                    {/* Search */}
                    <div>
                        <label
                            htmlFor="menuSearch"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Search Menu Items
                        </label>

                        <input
                            id="menuSearch"
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search dishes, e.g. butter chicken, biryani, raita..."
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label
                            htmlFor="categoryFilter"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Filter by Category
                        </label>

                        <select
                            id="categoryFilter"
                            value={selectedCategoryFilter}
                            onChange={(event) =>
                                setSelectedCategoryFilter(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
                        >
                            <option value="all">All Categories</option>

                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name} ({category.items.length})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Matching Items Count */}
                    <p className="text-xs text-slate-500">
                        {matchingItemCount} matching menu items
                    </p>

                </div>

                {showCategoryForm && (
                    // Your existing category form continues here
                    <form
                        onSubmit={addCategory}
                        className="mt-6 rounded-xl border bg-white p-5 shadow-sm"
                    >
                        <label
                            htmlFor="categoryName"
                            className="block text-sm font-semibold"
                        >
                            Category Name
                        </label>

                        <input
                            id="categoryName"
                            value={categoryName}
                            onChange={(event) => setCategoryName(event.target.value)}
                            maxLength={100}
                            required
                            placeholder="Example: Appetizers"
                            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                        />

                        <button
                            type="submit"
                            disabled={saving || !categoryName.trim()}
                            className="mt-4 rounded-lg bg-orange-700 px-5 py-2 font-semibold text-white disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Category"}
                        </button>
                    </form>
                )}

                {error && (
                    <p role="alert" className="mt-4 text-red-700">
                        {error}
                    </p>
                )}

                {success && (
                    <p role="status" className="mt-4 text-green-700">
                        {success}
                    </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={
                                filteredCategories.flatMap((category) =>
                                    category.items.map((item) => item.id)
                                ).length > 0 &&
                                filteredCategories.flatMap((category) =>
                                    category.items.map((item) => item.id)
                                ).every((id) => selectedItemIds.includes(id))
                            }
                            onChange={toggleSelectAllFiltered}
                            disabled={bulkBusy}
                        />
                        Select All Filtered
                    </label>

                    <span className="text-sm text-slate-600">
                        {selectedItemIds.length} selected
                    </span>

                    <button
                        type="button"
                        disabled={selectedItemIds.length === 0 || bulkBusy}
                        onClick={() => bulkUpdateItems(true)}
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Publish Selected
                    </button>

                    <button
                        type="button"
                        disabled={selectedItemIds.length === 0 || bulkBusy}
                        onClick={() => bulkUpdateItems(false)}
                        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Hide Selected
                    </button>

                    <button
                        type="button"
                        disabled={selectedItemIds.length === 0 || bulkBusy}
                        onClick={() => setSelectedItemIds([])}
                        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                    >
                        Clear Selection
                    </button>
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                        <label
                            htmlFor="destinationCategory"
                            className="text-sm font-medium text-slate-700"
                        >
                            Move Selected To:
                        </label>

                        <select
                            id="destinationCategory"
                            value={destinationCategoryId}
                            onChange={(event) =>
                                setDestinationCategoryId(event.target.value)
                            }
                            disabled={bulkBusy}
                            className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                            <option value="">Choose Category</option>

                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            disabled={
                                selectedItemIds.length === 0 ||
                                !destinationCategoryId ||
                                bulkBusy
                            }
                            onClick={bulkMoveItems}
                            className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {bulkBusy ? "Moving..." : "Move Selected"}
                        </button>
                    </div>
                </div>
                <div className="mt-8 space-y-6">
                    {filteredCategories.map((category) => (
                        <section
                            key={category.id}
                            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold">{category.name}</h2>
                                    <p className="text-xs text-slate-500">
                                        {category.items.length} menu items
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Category status badge */}
                                    <span
                                        className={
                                            category.isActive
                                                ? "rounded-full bg-green-100 px-3 py-1 text-xs text-green-700"
                                                : "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                                        }
                                    >
                                        {category.isActive ? "Active" : "Inactive"}
                                    </span>

                                    {/* Category Display Order */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-slate-600">
                                            Order
                                        </label>

                                        <input
                                            type="number"
                                            min={1}
                                            value={categoryOrders[category.id] ?? 0}
                                            onChange={(event) =>
                                                setCategoryOrders((previous) => ({
                                                    ...previous,
                                                    [category.id]: Number(event.target.value),
                                                }))
                                            }
                                            id={`category-order-${category.id}`}
                                            className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById(
                                                    `category-order-${category.id}`
                                                ) as HTMLInputElement | null;

                                                if (!input) return;

                                                const order = Number(input.value);

                                                if (!Number.isInteger(order) || order < 1) {
                                                    setError("Please enter a valid display order.");
                                                    return;
                                                }

                                                updateCategoryOrder(category.id, order);
                                            }}
                                            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
                                        >
                                            Save Order
                                        </button>
                                    </div>

                                    {/* Activate / Deactivate button */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleCategoryActive(category.id, category.isActive)
                                        }
                                        className={
                                            category.isActive
                                                ? "rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
                                                : "rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
                                        }
                                    >
                                        {category.isActive ? "Deactivate Category" : "Activate Category"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { openItemForm(category.id); resetPhotoState(); }}
                                        className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800"
                                    >
                                        {selectedCategoryId === category.id
                                            ? "Cancel"
                                            : "+ Add Item"}
                                    </button>
                                </div>
                            </div>



                            {selectedCategoryId === category.id && (
                                <form
                                    onSubmit={(event) => editingItemId ? saveItemChanges(event) : addItem(event, category.id)}
                                    className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4"
                                >
                                    <h3 className="mb-4 font-semibold">
                                        {editingItemId ? `Edit Item in ${category.name}` : `Add Item to ${category.name}`}
                                    </h3>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="itemName"
                                                className="block text-sm font-medium"
                                            >
                                                Item Name *
                                            </label>
                                            <input
                                                id="itemName"
                                                required
                                                maxLength={150}
                                                value={itemForm.name}
                                                onChange={(event) =>
                                                    updateItem("name", event.target.value)
                                                }
                                                placeholder="Example: Vegetable Samosa"
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="itemPrice"
                                                className="block text-sm font-medium"
                                            >
                                                Price ($) *
                                            </label>
                                            <input
                                                id="itemPrice"
                                                type="number"
                                                min="0.01"
                                                max="100000"
                                                step="0.01"
                                                required
                                                value={itemForm.price}
                                                onChange={(event) =>
                                                    updateItem("price", event.target.value)
                                                }
                                                placeholder="9.99"
                                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label
                                            htmlFor="itemDescription"
                                            className="block text-sm font-medium"
                                        >
                                            Description
                                        </label>
                                        <textarea
                                            id="itemDescription"
                                            rows={3}
                                            maxLength={2000}
                                            value={itemForm.description}
                                            onChange={(event) =>
                                                updateItem("description", event.target.value)
                                            }
                                            placeholder="Describe the dish..."
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"
                                        />
                                    </div>
                                    {editingItemId && (
                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label
                                                    htmlFor="itemCategory"
                                                    className="block text-sm font-medium"
                                                >
                                                    Menu Category
                                                </label>

                                                <select
                                                    id="itemCategory"
                                                    value={itemForm.categoryId}
                                                    onChange={(event) =>
                                                        updateItem("categoryId", event.target.value)
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"
                                                >
                                                    {categories.map((category) => (
                                                        <option key={category.id} value={category.id}>
                                                            {category.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex items-center">
                                                <label className="flex items-center gap-3 text-sm font-medium">
                                                    <input
                                                        type="checkbox"
                                                        checked={itemForm.isActive}
                                                        onChange={(event) =>
                                                            updateItem("isActive", event.target.checked)
                                                        }
                                                    />
                                                    Show on Customer Menu
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-6">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={itemForm.isVegetarian}
                                                onChange={(event) =>
                                                    updateItem("isVegetarian", event.target.checked)
                                                }
                                            />
                                            Vegetarian
                                        </label>

                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={itemForm.isVegan}
                                                onChange={(event) =>
                                                    updateItem("isVegan", event.target.checked)
                                                }
                                            />
                                            Vegan
                                        </label>
                                    </div>

                                    {editingItemId && (
                                        <div className="mt-5 rounded-lg border border-orange-200 bg-white p-4">
                                            <h4 className="font-semibold">Dish Picture</h4>
                                            <p className="mt-1 text-sm text-slate-600">
                                                JPG, PNG, or WebP, up to 5 MB. Picture changes save separately from dish details.
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-start gap-4">
                                                {(photoPreview || currentPhoto) ? (
                                                    <Image
                                                        src={photoPreview || currentPhoto || ""}
                                                        alt={`Picture of ${itemForm.name}`}
                                                        width={160}
                                                        height={120}
                                                        unoptimized
                                                        className="h-32 w-40 rounded-lg border object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-32 w-40 items-center justify-center rounded-lg border bg-slate-100 text-sm text-slate-500">
                                                        No picture yet
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-3">
                                                    <input
                                                        aria-label="Choose dish picture"
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={selectPhoto}
                                                        disabled={photoBusy || saving}
                                                        className="max-w-full text-sm"
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={!photoFile || photoBusy || saving}
                                                            onClick={uploadPhoto}
                                                            className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                                        >
                                                            {photoBusy ? "Working..." : currentPhoto ? "Replace Photo" : "Upload Photo"}
                                                        </button>
                                                        {photoFile && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPhotoFile(null)}
                                                                disabled={photoBusy}
                                                                className="rounded-lg border px-4 py-2 text-sm"
                                                            >
                                                                Cancel Selection
                                                            </button>
                                                        )}
                                                        {currentPhoto && (
                                                            <button
                                                                type="button"
                                                                disabled={photoBusy || saving}
                                                                onClick={removePhoto}
                                                                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                                                            >
                                                                Remove Photo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={saving || photoBusy}
                                        className="mt-5 rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white hover:bg-orange-800 disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : editingItemId ? "Save Changes" : "Save Menu Item"}
                                    </button>
                                </form>
                            )}

                            <div className="space-y-3">
                                {category.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                aria-label={`Select ${item.name}`}
                                                checked={selectedItemIds.includes(item.id)}
                                                onChange={() => toggleItemSelection(item.id)}
                                                disabled={bulkBusy}
                                                className="h-4 w-4 accent-orange-700"
                                            />
                                            {item.image ? (
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    width={64}
                                                    height={64}
                                                    unoptimized
                                                    className="h-16 w-16 rounded-lg border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">No photo</div>
                                            )}
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    ${(item.priceCents / 100).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={
                                                item.isActive
                                                    ? "rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                                                    : "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                                            }
                                        >
                                            {item.isActive ? "Published" : "Hidden"}
                                        </span>

                                        <div className="flex items-center gap-3">
                                            <span
                                                className={
                                                    item.isAvailable
                                                        ? "rounded-full bg-green-100 px-3 py-1 text-xs text-green-700"
                                                        : "rounded-full bg-red-100 px-3 py-1 text-xs text-red-700"
                                                }
                                            >
                                                {item.isAvailable ? "Available" : "Sold Out"}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={saving || photoBusy}
                                                onClick={() => toggleAvailability(item)}
                                                className={`rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${item.isAvailable
                                                    ? "border-red-200 text-red-700 hover:bg-red-50"
                                                    : "border-green-200 text-green-700 hover:bg-green-50"
                                                    }`}
                                            >
                                                {item.isAvailable ? "Mark Sold Out" : "Mark Available"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={saving || photoBusy}
                                                onClick={() => editItem(item, category.id)}
                                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {category.items.length === 0 && (
                                    <p className="text-sm text-slate-500">
                                        No menu items in this category yet.
                                    </p>
                                )}
                            </div>
                        </section>
                    ))}

                    {categories.length === 0 && (
                        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
                            No menu categories found for this restaurant.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

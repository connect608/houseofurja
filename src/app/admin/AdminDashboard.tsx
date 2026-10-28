"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type { MenuRecord, Dish } from "@/lib/menuService";
import type { SafeAdminUser } from "@/lib/userService";
import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import {
  logoutAction,
  updateSpecialAction,
  updateDishAction,
  addDishAction,
  addCategoryAction,
  updateCategoryVisualAction,
  updateCategoryInfoAction,
  toggleCategoryStatusAction,
  toggleDishStatusAction,
  reorderDishesAction,
} from "@/lib/actions/menuActions";
import {
  createAdminUserAction,
  toggleAdminStatusAction,
  deleteAdminUserAction,
} from "@/lib/actions/userActions";
import CategoryImageUploader from "./CategoryImageUploader";

interface AdminDashboardProps {
  initialMenu: MenuRecord;
  currentUser?: SafeAdminUser;
  initialStaffList?: SafeAdminUser[];
}

export default function AdminDashboard({
  initialMenu,
  currentUser,
  initialStaffList = [],
}: AdminDashboardProps) {
  const [menu, setMenu] = useState<MenuRecord>(initialMenu);
  const [activeTab, setActiveTab] = useState<string>(
    Object.keys(initialMenu)[0] || "Our Menu"
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Category tab scroll navigation state for mobile & tablet
  const adminTabsRef = useRef<HTMLDivElement>(null);

  const isTabMouseDownRef = useRef(false);
  const tabStartXRef = useRef(0);
  const tabStartScrollLeftRef = useRef(0);
  const hasTabMovedRef = useRef(false);

  const categories = Object.keys(menu);

  useEffect(() => {
    const el = adminTabsRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [categories.length]);

  const handleAdminMouseDown = (e: React.MouseEvent) => {
    const el = adminTabsRef.current;
    if (!el) return;
    isTabMouseDownRef.current = true;
    hasTabMovedRef.current = false;
    tabStartXRef.current = e.pageX - el.offsetLeft;
    tabStartScrollLeftRef.current = el.scrollLeft;
  };

  const handleAdminMouseMove = (e: React.MouseEvent) => {
    const el = adminTabsRef.current;
    if (!isTabMouseDownRef.current || !el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - tabStartXRef.current;
    if (Math.abs(walk) > 4) {
      hasTabMovedRef.current = true;
    }
    el.scrollLeft = tabStartScrollLeftRef.current - walk;
  };

  const handleAdminMouseUp = () => {
    isTabMouseDownRef.current = false;
  };

  // Staff and Admin accounts state (Superadmin only)
  const [staffList, setStaffList] = useState<SafeAdminUser[]>(initialStaffList);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "superadmin",
  });


  // Today's special dish form state
  const specialCategory = menu["Today's Special"];
  const currentSpecialDish: Dish = specialCategory?.items?.[0] || {
    name: "",
    description: "",
    price: "",
  };

  const [specialForm, setSpecialForm] = useState<Dish>({
    name: currentSpecialDish.name,
    description: currentSpecialDish.description,
    price: currentSpecialDish.price,
  });

  // Regular dishes inline edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDishForm, setEditDishForm] = useState<Dish>({ name: "", description: "", price: "" });
  const [expandedAdminDishIdx, setExpandedAdminDishIdx] = useState<number | null>(null);
  const [draggedDishIdx, setDraggedDishIdx] = useState<number | null>(null);
  const [dragOverDishIdx, setDragOverDishIdx] = useState<number | null>(null);

  // Close expanded dish description when clicking outside in admin portal
  useEffect(() => {
    if (expandedAdminDishIdx === null) return;
    const handleAdminOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(`[data-admin-dish-idx="${expandedAdminDishIdx}"]`)) {
        setExpandedAdminDishIdx(null);
      }
    };
    document.addEventListener("click", handleAdminOutsideClick);
    return () => document.removeEventListener("click", handleAdminOutsideClick);
  }, [expandedAdminDishIdx]);

  // Add new dish form state
  const [showAddDish, setShowAddDish] = useState(false);
  const [newDishForm, setNewDishForm] = useState<Dish>({ name: "", description: "", price: "" });

  // Add category modal state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    categoryKey: "",
    title: "",
    description: "",
    image: "/assets/menu-chai.webp",
    imageAlt: "Refreshing house beverages and tea",
  });

  // Separate states for editing visual image vs category information
  const [isEditingVisual, setIsEditingVisual] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const activeCategoryData = menu[activeTab];

  const [editVisualForm, setEditVisualForm] = useState({
    image: activeCategoryData?.image || "/assets/menu-chai.webp",
    imageAlt: activeCategoryData?.imageAlt || "",
  });

  const [editInfoForm, setEditInfoForm] = useState({
    title: activeCategoryData?.title || "",
    description: activeCategoryData?.description?.join("\n") || "",
  });

  const showNotification = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSelectTab = (tabName: string) => {
    setActiveTab(tabName);
    setExpandedAdminDishIdx(null);
    setEditingIndex(null);
    setShowAddDish(false);
    setIsEditingVisual(false);
    setIsEditingInfo(false);
    const cat = menu[tabName];
    if (cat) {
      setEditVisualForm({
        image: cat.image,
        imageAlt: cat.imageAlt,
      });
      setEditInfoForm({
        title: cat.title,
        description: cat.description.join("\n"),
      });
    }
  };

  // Staff Management Handlers (Superadmin only)
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", newStaffForm.name);
      fd.append("email", newStaffForm.email);
      fd.append("password", newStaffForm.password);
      fd.append("role", newStaffForm.role);

      const res = await createAdminUserAction(fd);
      if (res.success) {
        showNotification("success", `✓ Live staff account for "${newStaffForm.name}" created!`);
        setShowAddStaffModal(false);
        setStaffList((prev) => [
          ...prev,
          {
            id: Date.now(),
            name: newStaffForm.name,
            email: newStaffForm.email.toLowerCase().trim(),
            role: newStaffForm.role,
            status: "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]);
        setNewStaffForm({ name: "", email: "", password: "", role: "admin" });
      } else {
        showNotification("error", res.error || "Failed to create staff account.");
      }
    });
  };

  const handleToggleStaff = (userId: number) => {
    startTransition(async () => {
      const res = await toggleAdminStatusAction(userId);
      if (res.success && res.newStatus) {
        setStaffList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: res.newStatus! } : u))
        );
        showNotification(
          "success",
          `✓ Account status updated to ${res.newStatus === "active" ? "Active" : "Deactivated"}!`
        );
      } else {
        showNotification("error", res.error || "Failed to update account status.");
      }
    });
  };

  const handleDeleteStaff = (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete administrator account "${name}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteAdminUserAction(userId);
      if (res.success) {
        setStaffList((prev) => prev.filter((u) => u.id !== userId));
        showNotification("success", `✓ Staff account "${name}" deleted.`);
      } else {
        showNotification("error", res.error || "Failed to delete account.");
      }
    });
  };

  // Handle Saving Today's Special Dish
  const handleSaveSpecial = (e: React.FormEvent) => {

    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", specialForm.name);
      fd.append("description", specialForm.description);
      fd.append("price", specialForm.price);

      const res = await updateSpecialAction(fd);
      if (res.success) {
        setMenu((prev) => {
          const updated = { ...prev };
          if (updated["Today's Special"]) {
            updated["Today's Special"] = {
              ...updated["Today's Special"],
              items: [specialForm, ...updated["Today's Special"].items.slice(1)],
            };
          }
          return updated;
        });
        showNotification("success", "✓ Today's Special published live to website!");
      } else {
        showNotification("error", res.error || "Failed to update special.");
      }
    });
  };

  // Handle Editing an existing dish
  const handleSaveEditDish = (categoryKey: string, index: number) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", editDishForm.name);
      fd.append("description", editDishForm.description);
      fd.append("price", editDishForm.price);

      const res = await updateDishAction(categoryKey, index, fd);
      if (res.success) {
        setMenu((prev) => {
          const updated = { ...prev };
          if (updated[categoryKey] && updated[categoryKey].items[index]) {
            updated[categoryKey].items[index] = editDishForm;
          }
          return updated;
        });
        setEditingIndex(null);
        showNotification("success", `✓ Updated "${editDishForm.name}" live!`);
      } else {
        showNotification("error", res.error || "Failed to update dish.");
      }
    });
  };

  // Handle Adding a new dish
  const handleAddDish = (categoryKey: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", newDishForm.name);
      fd.append("description", newDishForm.description);
      fd.append("price", newDishForm.price);

      const res = await addDishAction(categoryKey, fd);
      if (res.success) {
        setMenu((prev) => {
          const updated = { ...prev };
          if (updated[categoryKey]) {
            updated[categoryKey].items.push({ ...newDishForm, isAvailable: true });
          }
          return updated;
        });
        setShowAddDish(false);
        setNewDishForm({ name: "", description: "", price: "" });
        showNotification("success", `✓ Added "${newDishForm.name}" live!`);
      } else {
        showNotification("error", res.error || "Failed to add dish.");
      }
    });
  };

  // Handle Disabling / Enabling a Dish (Instead of Delete)
  const handleToggleDishStatus = (categoryKey: string, index: number, dishName: string) => {
    startTransition(async () => {
      const res = await toggleDishStatusAction(categoryKey, index);
      if (res.success) {
        setMenu((prev) => {
          const updated = { ...prev };
          if (updated[categoryKey] && updated[categoryKey].items[index]) {
            const current = updated[categoryKey].items[index].isAvailable !== false;
            updated[categoryKey].items[index] = {
              ...updated[categoryKey].items[index],
              isAvailable: !current,
            };
          }
          return updated;
        });
        const currentAvail = menu[categoryKey]?.items[index]?.isAvailable !== false;
        showNotification(
          "success",
          `✓ "${dishName}" is now ${currentAvail ? "Disabled (Hidden from menu)" : "Enabled (Live)"}.`
        );
      } else {
        showNotification("error", res.error || "Failed to toggle dish availability.");
      }
    });
  };

  // Handle Reordering Dishes (Drag-and-Drop + Move Up/Down buttons)
  const handleReorderDish = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const currentCat = menu[activeTab];
    if (!currentCat || !currentCat.items || toIdx >= currentCat.items.length) return;

    const items = [...currentCat.items];
    const [movedItem] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, movedItem);

    // Optimistically update UI
    setMenu((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        items,
      },
    }));

    // Server action to persist new order
    startTransition(async () => {
      const res = await reorderDishesAction(activeTab, items);
      if (res.success) {
        showNotification("success", `✓ Dish order in "${activeTab}" updated live!`);
      } else {
        showNotification("error", res.error || "Failed to save dish order.");
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedDishIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", idx.toString());
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDishIdx !== idx) {
      setDragOverDishIdx(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedDishIdx !== null && draggedDishIdx !== targetIdx) {
      handleReorderDish(draggedDishIdx, targetIdx);
    }
    setDraggedDishIdx(null);
    setDragOverDishIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedDishIdx(null);
    setDragOverDishIdx(null);
  };

  // Handle Disabling / Enabling a Category (Instead of Delete)
  const handleToggleCategoryStatus = (categoryKey: string) => {
    startTransition(async () => {
      const res = await toggleCategoryStatusAction(categoryKey);
      if (res.success) {
        setMenu((prev) => {
          const updated = { ...prev };
          if (updated[categoryKey]) {
            const current = updated[categoryKey].isActive !== false;
            updated[categoryKey] = {
              ...updated[categoryKey],
              isActive: !current,
            };
          }
          return updated;
        });
        const currentActive = menu[categoryKey]?.isActive !== false;
        showNotification(
          "success",
          `✓ Category "${categoryKey}" is now ${currentActive ? "Disabled (Hidden from menu)" : "Enabled (Live)"}.`
        );
      } else {
        showNotification("error", res.error || "Failed to toggle category status.");
      }
    });
  };

  // Handle Creating a New Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const key = newCategoryForm.categoryKey.trim();
    if (!key) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append("categoryKey", key);
      fd.append("title", newCategoryForm.title || key);
      fd.append("description", newCategoryForm.description);
      fd.append("image", newCategoryForm.image);
      fd.append("imageAlt", newCategoryForm.imageAlt);

      const res = await addCategoryAction(fd);
      if (res.success) {
        const descArray = newCategoryForm.description
          ? newCategoryForm.description.split("\n").map((p) => p.trim()).filter(Boolean)
          : ["Freshly prepared selections daily."];

        setMenu((prev) => ({
          ...prev,
          [key]: {
            title: newCategoryForm.title || key,
            description: descArray,
            image: newCategoryForm.image,
            imageAlt: newCategoryForm.imageAlt,
            items: [],
            isActive: true,
          },
        }));

        setShowAddCategoryModal(false);
        setNewCategoryForm({
          categoryKey: "",
          title: "",
          description: "",
          image: "/assets/menu-chai.webp",
          imageAlt: "Refreshing house beverages and tea",
        });
        handleSelectTab(key);
        showNotification("success", `✓ Category "${key}" created live!`);
      } else {
        showNotification("error", res.error || "Failed to create category.");
      }
    });
  };

  // Handle Updating Category Visual Photograph
  const handleSaveCategoryVisual = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("image", editVisualForm.image);
      fd.append("imageAlt", editVisualForm.imageAlt);

      const res = await updateCategoryVisualAction(activeTab, fd);
      if (res.success) {
        setMenu((prev) => {
          const updated = { ...prev };
          if (updated[activeTab]) {
            updated[activeTab] = {
              ...updated[activeTab],
              image: editVisualForm.image,
              imageAlt: editVisualForm.imageAlt,
            };
          }
          return updated;
        });

        setIsEditingVisual(false);
        showNotification("success", `✓ Visual image for "${activeTab}" updated live!`);
      } else {
        showNotification("error", res.error || "Failed to update visual image.");
      }
    });
  };

  // Handle Updating Category Heading & Copy
  const handleSaveCategoryInfo = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("title", editInfoForm.title);
      fd.append("description", editInfoForm.description);

      const res = await updateCategoryInfoAction(activeTab, fd);
      if (res.success) {
        const descArray = editInfoForm.description
          ? editInfoForm.description.split("\n").map((p) => p.trim()).filter(Boolean)
          : ["Freshly prepared selections daily."];

        setMenu((prev) => {
          const updated = { ...prev };
          if (updated[activeTab]) {
            updated[activeTab] = {
              ...updated[activeTab],
              title: editInfoForm.title,
              description: descArray,
            };
          }
          return updated;
        });

        setIsEditingInfo(false);
        showNotification("success", `✓ Category info for "${activeTab}" updated live!`);
      } else {
        showNotification("error", res.error || "Failed to update category info.");
      }
    });
  };

  const currentCategory = menu[activeTab];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ee]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#2e1c18]/10 bg-[#f7f4ee]/95 backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-[12%] 2xl:px-[15%] flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 sm:py-4">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 w-full sm:w-auto">
            <BrandMark />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="border border-[#df8b32]/40 bg-[#df8b32]/10 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#df8b32]">
                Admin Portal
              </span>
              <span className="inline-flex items-center gap-1.5 border border-[#2e1c18]/15 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-mono">
                <span className="h-1.5 w-1.5 bg-green-600 rounded-full" />
                <span className="font-bold uppercase tracking-wider text-[#2e1c18]">
                  {currentUser?.role === "superadmin" ? "superadmin" : "admin"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2e1c18]/10">
            {/* Manage Staff button moved to header (Superadmin only) */}
            {currentUser?.role === "superadmin" && (
              <button
                type="button"
                onClick={() =>
                  handleSelectTab(
                    activeTab === "__STAFF__"
                      ? Object.keys(menu)[0] || "Today's Special"
                      : "__STAFF__"
                  )
                }
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition border ${
                  activeTab === "__STAFF__"
                    ? "border-[#2e1c18] bg-[#2e1c18] text-[#f7f4ee]"
                    : "border-[#2e1c18]/25 bg-white text-[#2e1c18] hover:bg-gray-100 shadow-xs"
                }`}
              >
                <span>👥</span>
                <span>
                  {activeTab === "__STAFF__"
                    ? "Menu"
                    : `Staff (${staffList.length})`}
                </span>
              </button>
            )}

            <Link
              href="/menu"
              target="_blank"
              className="inline-flex items-center gap-1 border border-[#2e1c18]/20 bg-white/80 px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-[#2e1c18] transition hover:bg-white"
            >
              <span>Live Menu ↗</span>
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="border border-transparent px-2.5 sm:px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Admin Content: Full width with responsive scaling */}
      <main className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-[12%] 2xl:px-[15%] py-6 sm:py-8 flex-1 space-y-6 sm:space-y-8">
        {/* Toast Notification */}
        {feedback && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 text-xs font-semibold shadow-xl transition-all ${
              feedback.type === "success"
                ? "bg-[#606c48] text-white border border-[#606c48]/50"
                : "bg-red-700 text-white border border-red-800"
            }`}
          >
            {feedback.msg}
          </div>
        )}

      {/* Tabs & Add Category Bar (Scrollable on mobile/tablet) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2e1c18]/15 pb-4 min-w-0 max-w-full">
        {/* Scrollable Tabs Strip */}
        <div className="relative flex-1 min-w-0 max-w-full flex items-center">
          <div
            ref={adminTabsRef}
            onMouseDown={handleAdminMouseDown}
            onMouseMove={handleAdminMouseMove}
            onMouseUp={handleAdminMouseUp}
            onMouseLeave={handleAdminMouseUp}
            className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 w-full min-w-0 max-w-full overscroll-x-contain touch-pan-x select-none cursor-grab active:cursor-grabbing scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((catName) => {
              const isActive = activeTab === catName;
              const isSpecial = catName === "Today's Special";
              const isCatDisabled = menu[catName]?.isActive === false;

              return (
                <button
                  key={catName}
                  type="button"
                  onClick={(e) => {
                    if (hasTabMovedRef.current) return;
                    handleSelectTab(catName);
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider transition border whitespace-nowrap shrink-0 ${
                    isActive
                      ? isSpecial
                        ? "border-[#df8b32] bg-[#df8b32] text-white"
                        : "border-[#2e1c18] bg-[#2e1c18] text-[#f7f4ee]"
                      : isCatDisabled
                      ? "border-transparent bg-gray-200 text-gray-500 hover:bg-gray-300 line-through"
                      : "border-transparent bg-white/80 text-[#2e1c18]/70 hover:bg-white hover:text-[#2e1c18]"
                  }`}
                >
                  <span>{catName}</span>
                  {isCatDisabled && (
                    <span className="bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 uppercase no-underline">
                      Disabled
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCategoryModal(true)}
          className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto border border-[#df8b32] bg-[#df8b32]/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#df8b32] hover:bg-[#df8b32] hover:text-white transition shrink-0 self-start sm:self-auto"
        >
          <span>+</span> Add Category
        </button>
      </div>

      {/* MODAL: ADD NEW CATEGORY (rounded-none, responsive scrollable) */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white p-5 sm:p-8 border border-[#2e1c18]/25 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2e1c18]/10 pb-4">
              <div>
                <h3 className="text-xl font-serif text-[#2e1c18]">Create New Menu Category</h3>
                <p className="text-xs text-[#2e1c18]/70">
                  Adds a new tab to your public menu with dedicated heading and split-screen visual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="p-2 text-sm text-[#2e1c18]/60 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                    Category Tab Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCategoryForm.categoryKey}
                    onChange={(e) =>
                      setNewCategoryForm({
                        ...newCategoryForm,
                        categoryKey: e.target.value,
                        title: newCategoryForm.title || e.target.value,
                      })
                    }
                    placeholder="e.g. Something to Sip"
                    className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2 text-xs"
                  />
                  <span className="text-[11px] text-[#2e1c18]/60">Shown on the interactive tab button.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                    Heading Title
                  </label>
                  <input
                    type="text"
                    value={newCategoryForm.title}
                    onChange={(e) =>
                      setNewCategoryForm({ ...newCategoryForm, title: e.target.value })
                    }
                    placeholder="e.g. Sip Something Fresh."
                    className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2 text-xs"
                  />
                  <span className="text-[11px] text-[#2e1c18]/60">Shown as the category title in menu copy.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                  Category Description
                </label>
                <textarea
                  rows={2}
                  value={newCategoryForm.description}
                  onChange={(e) =>
                    setNewCategoryForm({ ...newCategoryForm, description: e.target.value })
                  }
                  placeholder="Refreshing drinks, thoughtfully chosen to pair with bold flavors..."
                  className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2 text-xs"
                />
              </div>

              {/* Category Image Uploader with Validation */}
              <CategoryImageUploader
                currentImageUrl={newCategoryForm.image}
                currentImageAlt={newCategoryForm.imageAlt}
                onImageChange={(url, alt) =>
                  setNewCategoryForm((prev) => ({
                    ...prev,
                    image: url,
                    imageAlt: alt,
                  }))
                }
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-[#2e1c18]/10">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="border border-[#2e1c18]/20 bg-white px-4 py-2 text-xs font-semibold text-[#2e1c18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newCategoryForm.categoryKey}
                  className="bg-[#df8b32] px-5 py-2 text-xs font-semibold text-white hover:bg-[#c97924] disabled:opacity-50"
                >
                  {isPending ? "Creating Category..." : "Create Category Live"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SUPERADMIN STAFF MANAGEMENT VIEW OR CATEGORY SPLIT-SCREEN VIEW           */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === "__STAFF__" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2e1c18]/15 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTab(Object.keys(menu)[0] || "Today's Special")}
                  className="inline-flex items-center gap-1 border border-[#2e1c18]/20 bg-white px-2.5 py-0.5 text-xs font-semibold text-[#2e1c18] hover:bg-gray-100 transition mr-1"
                >
                  ← Back to Menu
                </button>
                <span className="border border-[#df8b32]/40 bg-[#df8b32]/10 px-2.5 py-0.5 text-xs font-bold text-[#df8b32] uppercase tracking-wider">
                  Superadmin Authority
                </span>
                <span className="bg-[#2e1c18]/5 px-2 py-0.5 text-xs font-medium text-[#2e1c18]/70">
                  {staffList.length} staff account{staffList.length === 1 ? "" : "s"}
                </span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-serif text-[#2e1c18]">
                Staff &amp; Administrator Management
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#2e1c18]/70">
                Superadmin control to create staff logins, assign roles, and immediately activate or deactivate portal access.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-[#df8b32] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c97924] transition shadow-sm"
            >
              <span>+</span> Add Staff Member
            </button>
          </div>

          {/* Staff Accounts List / Table */}
          <div className="border border-[#2e1c18]/15 bg-white divide-y divide-[#2e1c18]/10">
            <div className="hidden sm:grid grid-cols-12 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#2e1c18]/60 bg-[#2e1c18]/5">
              <div className="col-span-5">Staff Member</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {staffList.map((staff) => {
              const isSelf = staff.id === currentUser?.id;
              const isSuper = staff.role === "superadmin";

              return (
                <div
                  key={staff.id}
                  className={`flex flex-col sm:grid sm:grid-cols-12 sm:items-center px-5 py-4 gap-3 transition ${
                    staff.status === "disabled" ? "bg-gray-50/80 opacity-75" : "hover:bg-[#f7f4ee]/40"
                  }`}
                >
                  {/* Col 1: Name & Email */}
                  <div className="sm:col-span-5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base text-[#2e1c18] font-bold">
                        {staff.name}
                      </span>
                      {isSelf && (
                        <span className="border border-green-600/30 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-[#2e1c18]/70 mt-0.5">{staff.email}</p>
                  </div>

                  {/* Col 2: Role */}
                  <div className="sm:col-span-2">
                    <span
                      className={`inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                        isSuper
                          ? "border-[#df8b32]/50 bg-[#df8b32]/10 text-[#df8b32]"
                          : "border-[#2e1c18]/30 bg-[#2e1c18]/5 text-[#2e1c18]"
                      }`}
                    >
                      {isSuper ? "Superadmin" : "Staff Admin"}
                    </span>
                  </div>

                  {/* Col 3: Status */}
                  <div className="sm:col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold ${
                        staff.status === "active"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          staff.status === "active" ? "bg-green-600 animate-pulse" : "bg-red-600"
                        }`}
                      />
                      {staff.status === "active" ? "Active" : "Deactivated"}
                    </span>
                  </div>

                  {/* Col 4: Actions */}
                  <div className="sm:col-span-3 flex items-center justify-start sm:justify-end gap-2">
                    {isSelf ? (
                      <span className="text-xs text-[#2e1c18]/50 italic">Current Session</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleStaff(staff.id)}
                          className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                            staff.status === "active"
                              ? "border-amber-600/40 bg-amber-50 text-amber-900 hover:bg-amber-100"
                              : "border-green-600/40 bg-green-50 text-green-900 hover:bg-green-100"
                          }`}
                        >
                          {staff.status === "active" ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* MODAL: ADD NEW STAFF MEMBER */}
          {showAddStaffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
              <div className="relative w-full max-w-lg bg-white p-5 sm:p-8 border border-[#2e1c18]/25 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#2e1c18]/10 pb-4">
                  <div>
                    <h3 className="text-xl font-serif text-[#2e1c18]">Create New Staff Account</h3>
                    <p className="text-xs text-[#2e1c18]/70 mt-0.5">
                      Grant menu management permissions to a chef, kitchen lead, or floor manager.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="p-2 text-sm text-[#2e1c18]/60 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateStaff} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                      Staff Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaffForm.name}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                      placeholder="e.g. Head Chef Vikram"
                      className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                      Email Address (Login Username) *
                    </label>
                    <input
                      type="email"
                      required
                      value={newStaffForm.email}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                      placeholder="e.g. vikram@houseofurja.us"
                      className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                      Temporary Password (min. 8 characters) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newStaffForm.password}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2.5 text-sm"
                    />
                    <span className="text-[11px] text-[#2e1c18]/60">
                      Staff member will use this password to sign into the portal.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                      Account Role &amp; Permissions
                    </label>
                    <select
                      value={newStaffForm.role}
                      onChange={(e) =>
                        setNewStaffForm({
                          ...newStaffForm,
                          role: e.target.value as "admin" | "superadmin",
                        })
                      }
                      className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2.5 text-sm"
                    >
                      <option value="admin">Staff Admin (Manage Dishes, Daily Specials, Visuals)</option>
                      <option value="superadmin">Superadmin (Full Authority + Staff Account Management)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[#2e1c18]/10">
                    <button
                      type="button"
                      onClick={() => setShowAddStaffModal(false)}
                      className="border border-[#2e1c18]/20 bg-white px-4 py-2 text-xs font-semibold text-[#2e1c18]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !newStaffForm.name || !newStaffForm.email || !newStaffForm.password}
                      className="bg-[#df8b32] px-5 py-2 text-xs font-semibold text-white hover:bg-[#c97924] disabled:opacity-50"
                    >
                      {isPending ? "Creating Account..." : "Create Live Staff Account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : currentCategory ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* LEFT SIDE: Image and Image Edit ONLY (5 cols)                          */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4">
            {!isEditingVisual ? (
              <div className="space-y-4">
                {/* Showcase Category Image (Balanced, responsive height) */}
                <div className="group relative w-full h-64 sm:h-80 lg:h-[360px] overflow-hidden border border-[#2e1c18]/20 bg-[#2e1c18]/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentCategory.image}
                    alt={currentCategory.imageAlt || currentCategory.title}
                    className={`h-full w-full object-cover object-center transition duration-300 ${
                      currentCategory.isActive === false ? "grayscale contrast-75 opacity-75" : ""
                    }`}
                  />

                  {/* Status Badge overlay */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${
                        currentCategory.isActive !== false
                          ? "bg-white/95 text-[#606c48] border border-[#606c48]/30"
                          : "bg-red-600/95 text-white"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 ${
                          currentCategory.isActive !== false ? "bg-[#606c48] animate-pulse" : "bg-white"
                        }`}
                      />
                      {currentCategory.isActive !== false ? "Live on Menu" : "Category Disabled"}
                    </span>
                  </div>

                  {/* Hover Quick Action to Edit Visual */}
                  <div className="absolute top-3 right-3 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => {
                        setEditVisualForm({
                          image: currentCategory.image,
                          imageAlt: currentCategory.imageAlt || "",
                        });
                        setIsEditingVisual(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#df8b32] transition"
                    >
                      <span>📷</span> Change Visual
                    </button>
                  </div>

                  {/* Bottom Overlay Label */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#df8b32]">
                      Menu Split-Screen Visual
                    </p>
                    <p className="text-[11px] text-white/80 truncate mt-0.5 font-mono">
                      {currentCategory.image}
                    </p>
                  </div>
                </div>

                {/* Left Side Action Controls: Edit Visual + Disable/Enable Category */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2e1c18]/15">
                  <button
                    type="button"
                    onClick={() => {
                      setEditVisualForm({
                        image: currentCategory.image,
                        imageAlt: currentCategory.imageAlt || "",
                      });
                      setIsEditingVisual(true);
                    }}
                    className="inline-flex items-center gap-1.5 border border-[#2e1c18]/30 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#2e1c18] hover:bg-gray-100 transition shadow-sm"
                  >
                    <span>📷</span> Edit Visual
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleCategoryStatus(activeTab)}
                    className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                      currentCategory.isActive !== false
                        ? "border-amber-600/40 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : "border-green-600/40 bg-green-50 text-green-900 hover:bg-green-100"
                    }`}
                  >
                    <span>{currentCategory.isActive !== false ? "⏸️" : "▶️"}</span>
                    {currentCategory.isActive !== false
                      ? "Disable Category"
                      : "Enable Category"}
                  </button>
                </div>
              </div>
            ) : (
              /* DEDICATED VISUAL IMAGE EDITOR (Exclusively on Left Side) */
              <form onSubmit={handleSaveCategoryVisual} className="space-y-4 bg-white p-4 border border-[#2e1c18]/15 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#2e1c18]/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">📷</span>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#2e1c18]">
                        Edit Category Visual
                      </h3>
                    </div>
                    <p className="text-xs text-[#df8b32] font-semibold mt-0.5">
                      {activeTab}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingVisual(false)}
                    className="border border-[#2e1c18]/20 bg-white px-2.5 py-1 text-xs text-[#2e1c18]/70 hover:bg-gray-100 hover:text-black transition"
                  >
                    ✕ Cancel
                  </button>
                </div>

                {/* Clean, Streamlined Category Image Uploader */}
                <CategoryImageUploader
                  currentImageUrl={editVisualForm.image}
                  currentImageAlt={editVisualForm.imageAlt}
                  variant="featured"
                  onImageChange={(url, alt) =>
                    setEditVisualForm({
                      image: url,
                      imageAlt: alt,
                    })
                  }
                />

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2e1c18]/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingVisual(false)}
                    className="border border-[#2e1c18]/20 bg-white px-4 py-2 text-xs font-semibold text-[#2e1c18] hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-[#df8b32] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c97924] transition shadow-xs disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Visual Image"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* RIGHT SIDE: Category Info (shifted here) + Menu Items (7 cols)         */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. CATEGORY INFO SECTION (Right before menu items) */}
            {!isEditingInfo ? (
              <div className="border-b border-[#2e1c18]/15 pb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#df8b32]/40 bg-[#df8b32]/10 px-2.5 py-0.5 text-xs font-bold text-[#df8b32] uppercase tracking-wider">
                      {activeTab}
                    </span>
                    <span className="bg-[#2e1c18]/5 px-2 py-0.5 text-xs font-medium text-[#2e1c18]/70">
                      {currentCategory.items.length} dishes
                    </span>
                    {currentCategory.isActive === false && (
                      <span className="bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        Hidden from Customers
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="inline-flex items-center justify-center gap-1.5 border border-[#2e1c18]/30 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2e1c18] hover:bg-gray-100 transition shadow-sm w-full sm:w-auto"
                  >
                    <span>✏️</span> Edit Category Info
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif text-[#2e1c18]">
                  {currentCategory.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#2e1c18]/80 leading-relaxed">
                  {currentCategory.description.join(" ")}
                </p>
              </div>
            ) : (
              /* DEDICATED CATEGORY INFO & COPY EDITOR */
              <form onSubmit={handleSaveCategoryInfo} className="space-y-4 border-l-4 border-[#2e1c18] bg-white/70 p-4 border-b border-[#2e1c18]/15 pb-5">
                <div className="flex items-center justify-between border-b border-[#2e1c18]/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#2e1c18]">
                      Edit Category Info for &ldquo;{activeTab}&rdquo;
                    </h3>
                    <p className="text-[11px] text-[#2e1c18]/60 mt-0.5">
                      Update heading title and customer introductory copy.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="p-1 text-xs font-semibold text-[#2e1c18]/70 hover:text-black"
                  >
                    ✕ Close
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                    Category Heading Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editInfoForm.title}
                    onChange={(e) => setEditInfoForm({ ...editInfoForm, title: e.target.value })}
                    className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                    Customer Introductory Description
                  </label>
                  <textarea
                    rows={3}
                    value={editInfoForm.description}
                    onChange={(e) => setEditInfoForm({ ...editInfoForm, description: e.target.value })}
                    className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-2 text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-[#2e1c18]/60 mt-1">
                    Displayed above the dish items when customers browse this category on the menu page.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2e1c18]/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#2e1c18]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-[#2e1c18] px-4 py-1.5 text-xs font-semibold text-[#f7f4ee] hover:bg-[#452c26]"
                  >
                    {isPending ? "Saving..." : "Save Category Info"}
                  </button>
                </div>
              </form>
            )}

            {/* 2. MENU ITEMS (OR TODAY'S SPECIAL DISH EDITOR) */}
            {/* A) FOR TODAY'S SPECIAL: Daily Rotating Special Dish Editor */}
            {activeTab === "Today's Special" && (
              <div className="space-y-5">
                <div className="border-b border-[#2e1c18]/15 pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#df8b32]">
                    Daily Rotating Lunch Special
                  </span>
                  <h3 className="mt-1 text-2xl font-serif text-[#2e1c18]">
                    Update Today&apos;s Featured Special Dish
                  </h3>
                  <p className="mt-1 text-xs text-[#2e1c18]/70">
                    Changes saved here update both the Home page teaser and the Menu page live instantly.
                  </p>
                </div>

                <form onSubmit={handleSaveSpecial} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                      Special Dish Name
                    </label>
                    <input
                      type="text"
                      required
                      value={specialForm.name}
                      onChange={(e) => setSpecialForm({ ...specialForm, name: e.target.value })}
                      placeholder="e.g. Chicken Tikka Masala"
                      className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2.5 text-base font-serif text-[#2e1c18] focus:border-[#df8b32] focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                        Price
                      </label>
                      <input
                        type="text"
                        required
                        value={specialForm.price}
                        onChange={(e) => setSpecialForm({ ...specialForm, price: e.target.value })}
                        placeholder="e.g. $16.50"
                        className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2.5 text-base font-serif text-[#2e1c18] focus:border-[#df8b32] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
                        Short Description
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={specialForm.description}
                        onChange={(e) => setSpecialForm({ ...specialForm, description: e.target.value })}
                        placeholder="Tender chicken in a velvety tomato sauce with cultured butter, fenugreek, and warming spice..."
                        className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3.5 py-2 text-xs text-[#2e1c18] focus:border-[#df8b32] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex w-full sm:w-auto items-center justify-center bg-[#df8b32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c97924] disabled:opacity-50"
                    >
                      {isPending ? "Publishing to Website..." : "Publish Today's Special Live"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* B) FOR OTHER CATEGORIES: Dishes List & Add Dish Section */}
            {activeTab !== "Today's Special" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#2e1c18]/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-serif text-[#2e1c18]">Menu Items</h3>
                      <span className="bg-[#2e1c18]/10 px-2 py-0.5 text-xs font-semibold text-[#2e1c18]">
                        {currentCategory.items.length} dishes
                      </span>
                    </div>
                    <p className="text-xs text-[#2e1c18]/70 mt-0.5">
                      Manage dish items, descriptions, and prices for {activeTab}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDish(!showAddDish);
                      setNewDishForm({ name: "", description: "", price: "" });
                    }}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-[#2e1c18] px-3.5 py-2 text-xs font-semibold text-[#f7f4ee] transition hover:bg-[#452c26]"
                  >
                    {showAddDish ? "✕ Cancel" : "+ Add New Dish"}
                  </button>
                </div>

                {/* ADD NEW DISH BOX */}
                {showAddDish && (
                  <div className="border-l-4 border-[#df8b32] bg-white/70 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#2e1c18]">
                      Add New Item to {activeTab}
                    </h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-[#2e1c18]/70">Item Name</label>
                        <input
                          type="text"
                          value={newDishForm.name}
                          onChange={(e) => setNewDishForm({ ...newDishForm, name: e.target.value })}
                          placeholder="e.g. Masala Chai"
                          className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-[#2e1c18]/70">Price</label>
                        <input
                          type="text"
                          value={newDishForm.price}
                          onChange={(e) => setNewDishForm({ ...newDishForm, price: e.target.value })}
                          placeholder="e.g. $4"
                          className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-[#2e1c18]/70">Description</label>
                      <textarea
                        rows={2}
                        value={newDishForm.description}
                        onChange={(e) => setNewDishForm({ ...newDishForm, description: e.target.value })}
                        placeholder="Ingredients and culinary notes..."
                        className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        disabled={isPending || !newDishForm.name || !newDishForm.price}
                        onClick={() => handleAddDish(activeTab)}
                        className="bg-[#df8b32] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#c97924] disabled:opacity-50"
                      >
                        {isPending ? "Adding..." : "Save & Add to Menu"}
                      </button>
                    </div>
                  </div>
                )}

                {/* DISH LIST (WITH DRAG TO REPOSITION & REORDER) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-[#2e1c18]/10 text-[11px] text-[#2e1c18]/60">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#df8b32]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
                    </svg>
                    <span><strong>Drag & Drop</strong> items or use <strong>▲ / ▼</strong> to set menu display order</span>
                  </div>
                  <span className="text-[10px] text-[#2e1c18]/40">Changes save automatically to live menu</span>
                </div>

                <div className="divide-y divide-[#2e1c18]/10">
                  {currentCategory.items.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#2e1c18]/60">
                      No items in this category yet. Click &ldquo;+ Add New Dish&rdquo; above to add your first dish.
                    </div>
                  ) : (
                    currentCategory.items.map((dish, idx) => {
                      const isEditing = editingIndex === idx;
                      const isItemDisabled = dish.isAvailable === false;
                      const isDragging = draggedDishIdx === idx;
                      const isDragOver = dragOverDishIdx === idx && draggedDishIdx !== idx;

                      return (
                        <div
                          key={`${dish.name}-${idx}`}
                          draggable={!isEditing && !isPending}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`py-3.5 px-2 transition-all first:pt-2 last:pb-2 ${
                            isDragging
                              ? "opacity-40 bg-amber-50/60 border-2 border-dashed border-[#df8b32]"
                              : isDragOver
                              ? "bg-[#df8b32]/10 border-t-2 border-[#df8b32]"
                              : "hover:bg-[#2e1c18]/[0.02]"
                          }`}
                        >
                          {isEditing ? (
                            <div className="border border-[#2e1c18]/20 bg-white/80 p-4 space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-semibold text-[#2e1c18]/70">Name</label>
                                  <input
                                    type="text"
                                    value={editDishForm.name}
                                    onChange={(e) => setEditDishForm({ ...editDishForm, name: e.target.value })}
                                    className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-sm font-serif"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-[#2e1c18]/70">Price</label>
                                  <input
                                    type="text"
                                    value={editDishForm.price}
                                    onChange={(e) => setEditDishForm({ ...editDishForm, price: e.target.value })}
                                    className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-sm font-serif"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-[#2e1c18]/70">Description</label>
                                <textarea
                                  rows={2}
                                  value={editDishForm.description}
                                  onChange={(e) => setEditDishForm({ ...editDishForm, description: e.target.value })}
                                  className="mt-1 w-full border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs"
                                />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleSaveEditDish(activeTab, idx)}
                                  className="bg-[#df8b32] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#c97924]"
                                >
                                  {isPending ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingIndex(null)}
                                  className="border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#2e1c18]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-4">
                              <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                                {/* DRAG HANDLE & REORDER CONTROLS */}
                                <div className="flex items-center gap-1 shrink-0 pt-0.5 select-none">
                                  {/* Drag Grip Handle */}
                                  <div
                                    title="Click and drag up or down to reorder"
                                    className="cursor-grab active:cursor-grabbing p-1 text-[#2e1c18]/40 hover:text-[#df8b32] hover:bg-stone-200/50 transition-colors"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="8" cy="6" r="2" />
                                      <circle cx="16" cy="6" r="2" />
                                      <circle cx="8" cy="12" r="2" />
                                      <circle cx="16" cy="12" r="2" />
                                      <circle cx="8" cy="18" r="2" />
                                      <circle cx="16" cy="18" r="2" />
                                    </svg>
                                  </div>

                                  {/* Position Index Badge */}
                                  <span
                                    title={`Current position: #${idx + 1}`}
                                    className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-stone-100 text-[#2e1c18]/60 border border-[#2e1c18]/10"
                                  >
                                    #{idx + 1}
                                  </span>

                                  {/* Quick Move Up / Down Buttons */}
                                  <div className="flex flex-col ml-0.5">
                                    <button
                                      type="button"
                                      disabled={idx === 0 || isPending}
                                      onClick={() => handleReorderDish(idx, idx - 1)}
                                      title={idx === 0 ? "Already first" : "Move up"}
                                      className="p-0.5 text-[9px] leading-none text-[#2e1c18]/60 hover:text-[#df8b32] disabled:opacity-20 disabled:hover:text-[#2e1c18]/60 transition"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === currentCategory.items.length - 1 || isPending}
                                      onClick={() => handleReorderDish(idx, idx + 1)}
                                      title={idx === currentCategory.items.length - 1 ? "Already last" : "Move down"}
                                      className="p-0.5 text-[9px] leading-none text-[#2e1c18]/60 hover:text-[#df8b32] disabled:opacity-20 disabled:hover:text-[#2e1c18]/60 transition"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                </div>

                                {/* Dish Name, Price, Description */}
                                <div className="max-w-xl min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                                    <h4
                                      className={`font-serif text-base sm:text-lg font-medium ${
                                        isItemDisabled ? "text-gray-400 line-through" : "text-[#2e1c18]"
                                      }`}
                                    >
                                      {dish.name}
                                    </h4>
                                    <span
                                      className={`font-serif text-sm sm:text-base font-semibold ${
                                        isItemDisabled ? "text-gray-400" : "text-[#df8b32]"
                                      }`}
                                    >
                                      {dish.price}
                                    </span>
                                    {isItemDisabled && (
                                      <span className="bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                        Disabled
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    data-admin-dish-idx={idx}
                                    onClick={() =>
                                      setExpandedAdminDishIdx(
                                        expandedAdminDishIdx === idx ? null : idx
                                      )
                                    }
                                    className={`mt-1 text-xs leading-relaxed transition-all cursor-pointer ${
                                      expandedAdminDishIdx === idx ? "" : "line-clamp-2"
                                    } ${isItemDisabled ? "text-gray-400" : "text-[#2e1c18]/70 hover:text-[#2e1c18]"}`}
                                    title={
                                      expandedAdminDishIdx === idx
                                        ? "Click to collapse"
                                        : "Click to read full description"
                                    }
                                  >
                                    {dish.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0 pl-7 sm:pl-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIndex(idx);
                                    setEditDishForm({ ...dish });
                                  }}
                                  className="border border-[#2e1c18]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#2e1c18] hover:border-[#df8b32] hover:text-[#df8b32] transition"
                                >
                                  Edit
                                </button>

                                {/* DISABLE / ENABLE DISH TOGGLE */}
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleToggleDishStatus(activeTab, idx, dish.name)}
                                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                                    !isItemDisabled
                                      ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                      : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                                  }`}
                                >
                                  {!isItemDisabled ? "Disable" : "Enable"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      </main>
    </div>
  );
}

"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { PaginationMeta, PAGE_SIZE_OPTIONS } from "@/types/pagination"

interface PaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  showPageSizeSelector?: boolean
}

export function Pagination({ 
  pagination, 
  onPageChange, 
  onPageSizeChange,
  showPageSizeSelector = true 
}: PaginationProps) {
  const { page, pageSize, totalItems, totalPages, hasNext, hasPrev } = pagination

  // Calculate showing range
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page > 3) {
        pages.push("...")
      }

      // Show pages around current
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (page < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalItems === 0) {
    return null
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "1rem 0"
      }}
    >
      {/* Page X-Y of Z */}
      <p style={{ fontSize: "0.875rem", color: "#71717a" }}>
        Page <span style={{ fontWeight: 500, color: "#18181b" }}>{startItem}</span>
        {" - "}
        <span style={{ fontWeight: 500, color: "#18181b" }}>{endItem}</span>
        {" of "}
        <span style={{ fontWeight: 500, color: "#18181b" }}>{totalItems}</span>
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "1rem" }}>
            <label style={{ fontSize: "0.875rem", color: "#71717a" }}>
              Per page:
            </label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: "0.375rem 0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid #e4e4e7",
                fontSize: "0.875rem",
                backgroundColor: "white",
                cursor: "pointer"
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrev}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e4e4e7",
            backgroundColor: "white",
            cursor: hasPrev ? "pointer" : "not-allowed",
            opacity: hasPrev ? 1 : 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="First page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous page */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e4e4e7",
            backgroundColor: "white",
            cursor: hasPrev ? "pointer" : "not-allowed",
            opacity: hasPrev ? 1 : 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {getPageNumbers().map((pageNum, idx) => (
            pageNum === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "#71717a"
                }}
              >
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid",
                  borderColor: pageNum === page ? "#18181b" : "#e4e4e7",
                  backgroundColor: pageNum === page ? "#18181b" : "white",
                  color: pageNum === page ? "white" : "#18181b",
                  fontSize: "0.875rem",
                  fontWeight: pageNum === page ? 500 : 400,
                  cursor: "pointer",
                  minWidth: "2.25rem"
                }}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>

        {/* Next page */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e4e4e7",
            backgroundColor: "white",
            cursor: hasNext ? "pointer" : "not-allowed",
            opacity: hasNext ? 1 : 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e4e4e7",
            backgroundColor: "white",
            cursor: hasNext ? "pointer" : "not-allowed",
            opacity: hasNext ? 1 : 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}

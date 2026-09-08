"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { FileText } from "lucide-react"
import { getRefunds, RefundRequestWithReceipts } from "@/actions/refunds"
import { HistoryItem } from "./history-item"
import { Pagination } from "@/components/ui/pagination"
import { PaginatedResult, DEFAULT_PAGE_SIZE } from "@/types/pagination"

type RefundRequest = RefundRequestWithReceipts

interface HistoryListProps {
  initialData: PaginatedResult<RefundRequest>
}

export function HistoryList({ initialData }: HistoryListProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Use Query for data fetching
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['student-history', { page, pageSize }],
    queryFn: () => getRefunds({ page, pageSize }),
    placeholderData: (previousData) => previousData,
    initialData: page === 1 ? initialData : undefined
  })

  const result = data || initialData

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 500, color: '#18181b', marginBottom: '1rem' }}>
        All Requests
      </h2>

      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e4e4e7',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          overflow: 'hidden',
          opacity: isLoading || isPlaceholderData ? 0.7 : 1,
          transition: 'opacity 150ms'
        }}
      >
        {result.data.length > 0 ? (
          <>
            {result.data.map((request) => (
              <HistoryItem key={request.id} request={request} />
            ))}
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              color: '#71717a'
            }}
          >
            <FileText style={{ width: '2.5rem', height: '2.5rem', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 500 }}>No requests yet</p>
            <p style={{ fontSize: '0.875rem' }}>Your request history will appear here.</p>
          </div>
        )}
      </div>

      <Pagination
        pagination={result.pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}

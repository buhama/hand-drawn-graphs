import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons"

interface CreateDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDataCreate: (data: any[]) => void
}

export function CreateDataDialog({ open, onOpenChange, onDataCreate }: CreateDataDialogProps) {
  const [columns, setColumns] = useState<string[]>(['Column 1', 'Column 2'])
  const [rows, setRows] = useState<Record<string, string>[]>([{ 'Column 1': '', 'Column 2': '' }])

  const handleColumnNameChange = (oldName: string, newName: string) => {
    const updatedColumns = columns.map(col => col === oldName ? newName : col)
    const updatedRows = rows.map(row => {
      const newRow: Record<string, string> = {}
      Object.keys(row).forEach(key => {
        newRow[key === oldName ? newName : key] = row[key]
      })
      return newRow
    })
    setColumns(updatedColumns)
    setRows(updatedRows)
  }

  const handleAddColumn = () => {
    const newColumnName = `Column ${columns.length + 1}`
    setColumns([...columns, newColumnName])
    setRows(rows.map(row => ({ ...row, [newColumnName]: '' })))
  }

  const handleRemoveColumn = (columnName: string) => {
    if (columns.length <= 2) return // Maintain minimum 2 columns
    const updatedColumns = columns.filter(col => col !== columnName)
    const updatedRows = rows.map(row => {
      const newRow = { ...row }
      delete newRow[columnName]
      return newRow
    })
    setColumns(updatedColumns)
    setRows(updatedRows)
  }

  const handleAddRow = () => {
    const newRow: Record<string, string> = {}
    columns.forEach(col => newRow[col] = '')
    setRows([...rows, newRow])
  }

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return // Maintain minimum 1 row
    const updatedRows = rows.filter((_, i) => i !== index)
    setRows(updatedRows)
  }

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    const updatedRows = [...rows]
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [column]: value }
    setRows(updatedRows)
  }

  const handleSubmit = () => {
    // Validate data
    const isValid = rows.every(row => 
      Object.values(row).every(value => value.trim() !== '') &&
      Object.values(row).some(value => !isNaN(Number(value)))
    )

    if (!isValid) {
      alert('Please ensure all cells are filled and at least one column contains numeric values.')
      return
    }

    onDataCreate(rows)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Dataset</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {columns.map((column, index) => (
              <div key={index} className="flex items-center space-x-1">
                <Input
                  value={column}
                  onChange={(e) => handleColumnNameChange(column, e.target.value)}
                  className="w-32"
                />
                {columns.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveColumn(column)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddColumn}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center space-x-2">
                {columns.map((column, colIndex) => (
                  <Input
                    key={colIndex}
                    value={row[column]}
                    onChange={(e) => handleCellChange(rowIndex, column, e.target.value)}
                    className="w-32"
                    placeholder={`Value ${colIndex + 1}`}
                  />
                ))}
                {rows.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(rowIndex)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddRow}
            className="w-full"
          >
            Add Row
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Dataset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
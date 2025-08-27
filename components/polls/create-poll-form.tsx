"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatePollData } from "@/types"
import { createAuthHeaders } from "@/lib/auth"

interface CreatePollFormProps {
  onSuccess?: (pollId: string) => void
}

export function CreatePollForm({ onSuccess }: CreatePollFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreatePollData>({
    title: "",
    description: "",
    options: ["", ""],
    isPublic: true,
    allowMultipleVotes: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }))
    } else if (type === "datetime-local") {
      const date = value ? new Date(value) : undefined
      setFormData(prev => ({
        ...prev,
        [name]: date,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }

    if (error) setError(null)
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData(prev => ({
      ...prev,
      options: newOptions,
    }))

    if (error) setError(null)
  }

  const addOption = () => {
    if (formData.options.length < 10) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, ""],
      }))
    }
  }

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        options: newOptions,
      }))
    }
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Poll title is required")
      return false
    }

    if (formData.title.length < 5) {
      setError("Poll title must be at least 5 characters long")
      return false
    }

    const validOptions = formData.options.filter(option => option.trim())

    if (validOptions.length < 2) {
      setError("At least 2 poll options are required")
      return false
    }

    if (validOptions.some(option => option.length < 1)) {
      setError("All options must have at least 1 character")
      return false
    }

    // Check for duplicate options
    const uniqueOptions = new Set(validOptions.map(option => option.toLowerCase().trim()))
    if (uniqueOptions.size !== validOptions.length) {
      setError("Poll options must be unique")
      return false
    }

    // Validate expiration date
    if (formData.expiresAt && formData.expiresAt <= new Date()) {
      setError("Expiration date must be in the future")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      const validOptions = formData.options.filter(option => option.trim())

      const pollData = {
        ...formData,
        options: validOptions,
      }

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...createAuthHeaders(),
        },
        body: JSON.stringify(pollData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create poll")
      }

      const { poll } = await response.json()

      if (onSuccess) {
        onSuccess(poll.id)
      } else {
        router.push(`/polls/${poll.id}`)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create New Poll</CardTitle>
        <CardDescription>
          Create a poll to gather opinions from your audience
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Poll Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="What's your question?"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isLoading}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Poll Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add more context or details about your poll..."
              value={formData.description}
              onChange={handleInputChange}
              disabled={isLoading}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {(formData.description || "").length}/500 characters
            </p>
          </div>

          {/* Poll Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Poll Options *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={isLoading || formData.options.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>

            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      disabled={isLoading}
                      maxLength={100}
                    />
                  </div>
                  {formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              You can add up to 10 options. At least 2 are required.
            </p>
          </div>

          {/* Poll Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Poll Settings</Label>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isPublic" className="text-sm font-normal">
                  Make this poll public (visible to everyone)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultipleVotes"
                  name="allowMultipleVotes"
                  checked={formData.allowMultipleVotes}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="allowMultipleVotes" className="text-sm font-normal">
                  Allow multiple votes per person
                </Label>
              </div>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt">
              <Calendar className="h-4 w-4 inline mr-1" />
              Expiration Date (optional)
            </Label>
            <Input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              value={
                formData.expiresAt
                  ? new Date(formData.expiresAt.getTime() - formData.expiresAt.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={handleInputChange}
              disabled={isLoading}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for a poll that never expires
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Creating Poll..." : "Create Poll"}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

"use client";

import { Globe, Plus, Settings, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  CreateServiceFormData,
  GroupedService,
  ServiceDependency,
  ServiceInterface,
} from "./types";
import {
  validateName,
  validateServiceInterface,
  validateUrl,
} from "./validation";

const ENVIRONMENT_OPTIONS = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
] as const;

const RUNTIME_TYPE_OPTIONS = [
  { value: "ec2", label: "EC2" },
  { value: "vm", label: "VM" },
  { value: "k8s", label: "K8s" },
  { value: "lambda", label: "Lambda" },
  { value: "container", label: "Container" },
  { value: "paas", label: "PaaS" },
] as const;

// Re-export types for convenience
export type { CreateServiceFormData, ServiceInterface, ServiceDependency };

interface CreateServiceDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly existingServiceNames: readonly string[];
  readonly onSubmit: (data: CreateServiceFormData) => Promise<void>;
  readonly canCreate: boolean;
  readonly editingService?: GroupedService | null;
}

export function CreateServiceDrawer({
  open,
  onOpenChange,
  existingServiceNames,
  onSubmit,
  canCreate,
  editingService,
}: CreateServiceDrawerProps) {
  const [formData, setFormData] = useState<CreateServiceFormData>({
    name: "",
    owner: "",
    repository: "",
    interfaces: [],
    dependencies: [],
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateServiceFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interfaceErrors, setInterfaceErrors] = useState<
    Record<string, Partial<Record<keyof ServiceInterface, string>>>
  >({});

  const isEditing = editingService !== null && editingService !== undefined;

  const submitButtonText = useMemo(() => {
    if (isSubmitting) {
      return isEditing ? "Saving..." : "Creating...";
    }
    return isEditing ? "Save" : "Create";
  }, [isSubmitting, isEditing]);

  // Load editing service data when drawer opens
  useEffect(() => {
    if (open && editingService) {
      setFormData({
        name: editingService.name,
        owner: editingService.owner,
        repository: editingService.repository,
        interfaces: editingService.environments.map((env, idx) => ({
          id: `interface-${idx}`,
          domain: env.domain,
          env: env.env,
          branch: env.branch ?? "",
          runtimeType: env.runtimeType ?? "",
          runtimeId: env.runtimeId ?? "",
        })),
        dependencies: editingService.dependencies.map((dep, idx) => ({
          id: `dependency-${idx}`,
          name: dep,
        })),
      });
    } else if (!open) {
      setFormData({
        name: "",
        owner: "",
        repository: "",
        interfaces: [],
        dependencies: [],
      });
      setErrors({});
      setInterfaceErrors({});
      setIsSubmitting(false);
    }
  }, [open, editingService]);

  // Validate form
  const isFormValid = useMemo(() => {
    const nameError = validateName(
      formData.name,
      existingServiceNames,
      isEditing ? editingService?.name : undefined
    );
    const ownerValid = formData.owner.trim().length > 0;
    const repoError = validateUrl(formData.repository);

    if (nameError || !ownerValid || repoError) {
      return false;
    }

    // Validate interfaces
    for (const iface of formData.interfaces) {
      const ifaceErrors = validateServiceInterface(
        iface,
        formData.interfaces.filter((i) => i.id !== iface.id)
      );
      if (Object.keys(ifaceErrors).length > 0) {
        return false;
      }
    }

    return true;
  }, [formData, existingServiceNames, isEditing, editingService?.name]);

  const handleFieldChange = (
    field: keyof CreateServiceFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate on change
    if (field === "name") {
      const error = validateName(
        value,
        existingServiceNames,
        isEditing ? editingService?.name : undefined
      );
      setErrors((prev) => ({
        ...prev,
        name: error,
      }));
    } else if (field === "repository") {
      const error = validateUrl(value);
      setErrors((prev) => ({
        ...prev,
        repository: error,
      }));
    } else if (field === "owner") {
      setErrors((prev) => ({
        ...prev,
        owner: value.trim() ? undefined : "Owner is required",
      }));
    }
  };

  const handleAddInterface = () => {
    const newInterface: ServiceInterface = {
      id: `interface-${Date.now()}`,
      domain: "",
      env: "",
      branch: "",
      runtimeType: "",
      runtimeId: "",
    };
    setFormData((prev) => ({
      ...prev,
      interfaces: [...prev.interfaces, newInterface],
    }));
  };

  const handleRemoveInterface = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      interfaces: prev.interfaces.filter((iface) => iface.id !== id),
    }));
    setInterfaceErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleInterfaceChange = (
    id: string,
    field: keyof ServiceInterface,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      interfaces: prev.interfaces.map((iface) =>
        iface.id === id ? { ...iface, [field]: value } : iface
      ),
    }));

    // Validate interface
    const iface = formData.interfaces.find((i) => i.id === id);
    if (!iface) {
      return;
    }

    const updatedIface = { ...iface, [field]: value };
    const otherInterfaces = formData.interfaces.filter((i) => i.id !== id);
    const newErrors = validateServiceInterface(updatedIface, otherInterfaces);

    setInterfaceErrors((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...newErrors },
    }));
  };

  const handleAddDependency = () => {
    const newDependency: ServiceDependency = {
      id: `dependency-${Date.now()}`,
      name: "",
    };
    setFormData((prev) => ({
      ...prev,
      dependencies: [...prev.dependencies, newDependency],
    }));
  };

  const handleRemoveDependency = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((dep) => dep.id !== id),
    }));
  };

  const handleDependencyChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      dependencies: prev.dependencies.map((dep) =>
        dep.id === id ? { ...dep, name: value } : dep
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Filter out empty dependencies and deduplicate
      const validDependencies = Array.from(
        new Set(
          formData.dependencies
            .map((d) => d.name.trim())
            .filter((name) => name.length > 0)
        )
      );

      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        owner: formData.owner.trim(),
        repository: formData.repository.trim(),
        dependencies: validDependencies.map((name) => ({
          id: `dep-${name}`,
          name,
        })),
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create service:", error);
      // Keep drawer open on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!canCreate) {
    return null;
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex flex-col sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Service" : "Create Service"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Accordion
            className="w-full -space-y-px"
            collapsible
            defaultValue="general"
            type="single"
          >
            {/* General Section */}
            <AccordionItem
              className="overflow-hidden border bg-background px-4 first:rounded-t-lg last:rounded-b-lg last:border-b"
              value="general"
            >
              <AccordionTrigger className="group">
                <div className="flex items-center gap-2">
                  <Settings className="size-4 stroke-2 text-muted-foreground" />
                  <span>General</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4 pb-2">
                  <div className="space-y-2">
                    <Label htmlFor="service-name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      aria-invalid={errors.name ? "true" : "false"}
                      id="service-name"
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value)
                      }
                      placeholder="my-service"
                      value={formData.name}
                    />
                    {errors.name && (
                      <p className="text-destructive text-xs">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-owner">
                      Owner <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      aria-invalid={errors.owner ? "true" : "false"}
                      id="service-owner"
                      onChange={(e) =>
                        handleFieldChange("owner", e.target.value)
                      }
                      placeholder="team-name"
                      value={formData.owner}
                    />
                    {errors.owner && (
                      <p className="text-destructive text-xs">{errors.owner}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-repository">
                      Repository URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      aria-invalid={errors.repository ? "true" : "false"}
                      id="service-repository"
                      onChange={(e) =>
                        handleFieldChange("repository", e.target.value)
                      }
                      placeholder="https://github.com/org/repo"
                      type="url"
                      value={formData.repository}
                    />
                    {errors.repository && (
                      <p className="text-destructive text-xs">
                        {errors.repository}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Details Section */}
            <AccordionItem
              className="overflow-hidden border bg-background px-4 first:rounded-t-lg last:rounded-b-lg last:border-b"
              value="details"
            >
              <AccordionTrigger className="group">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 stroke-2 text-muted-foreground" />
                  <span>Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4 pb-2">
                  {/* Interfaces */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Interfaces</Label>
                      <Button
                        onClick={handleAddInterface}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Plus className="mr-1 size-3" />
                        Add
                      </Button>
                    </div>

                    {formData.interfaces.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No interfaces added yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.interfaces.map((iface) => (
                          <div
                            className="space-y-2 rounded-lg border bg-card p-3"
                            key={iface.id}
                          >
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Interface</Label>
                              <Button
                                onClick={() => handleRemoveInterface(iface.id)}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <Label
                                  className="text-xs"
                                  htmlFor={`domain-${iface.id}`}
                                >
                                  Domain{" "}
                                  <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  aria-invalid={
                                    interfaceErrors[iface.id]?.domain
                                      ? "true"
                                      : "false"
                                  }
                                  id={`domain-${iface.id}`}
                                  onChange={(e) =>
                                    handleInterfaceChange(
                                      iface.id,
                                      "domain",
                                      e.target.value
                                    )
                                  }
                                  placeholder="example.com"
                                  value={iface.domain}
                                />
                                {interfaceErrors[iface.id]?.domain && (
                                  <p className="text-destructive text-xs">
                                    {interfaceErrors[iface.id].domain}
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label
                                  className="text-xs"
                                  htmlFor={`env-${iface.id}`}
                                >
                                  Environment
                                </Label>
                                <Select
                                  onValueChange={(value) =>
                                    handleInterfaceChange(
                                      iface.id,
                                      "env",
                                      value
                                    )
                                  }
                                  value={iface.env || undefined}
                                >
                                  <SelectTrigger id={`env-${iface.id}`}>
                                    <SelectValue placeholder="Select environment" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ENVIRONMENT_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label
                                  className="text-xs"
                                  htmlFor={`branch-${iface.id}`}
                                >
                                  Branch
                                </Label>
                                <Input
                                  id={`branch-${iface.id}`}
                                  onChange={(e) =>
                                    handleInterfaceChange(
                                      iface.id,
                                      "branch",
                                      e.target.value
                                    )
                                  }
                                  placeholder="main"
                                  value={iface.branch}
                                />
                              </div>

                              <div>
                                <Label
                                  className="text-xs"
                                  htmlFor={`runtime-type-${iface.id}`}
                                >
                                  Runtime Type
                                </Label>
                                <Select
                                  onValueChange={(value) =>
                                    handleInterfaceChange(
                                      iface.id,
                                      "runtimeType",
                                      value
                                    )
                                  }
                                  value={iface.runtimeType || undefined}
                                >
                                  <SelectTrigger
                                    id={`runtime-type-${iface.id}`}
                                  >
                                    <SelectValue placeholder="Select runtime type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RUNTIME_TYPE_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {iface.runtimeType && (
                                <div>
                                  <Label
                                    className="text-xs"
                                    htmlFor={`runtime-id-${iface.id}`}
                                  >
                                    Runtime ID{" "}
                                    <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    aria-invalid={
                                      interfaceErrors[iface.id]?.runtimeId
                                        ? "true"
                                        : "false"
                                    }
                                    id={`runtime-id-${iface.id}`}
                                    onChange={(e) =>
                                      handleInterfaceChange(
                                        iface.id,
                                        "runtimeId",
                                        e.target.value
                                      )
                                    }
                                    placeholder="runtime-identifier"
                                    value={iface.runtimeId}
                                  />
                                  {interfaceErrors[iface.id]?.runtimeId && (
                                    <p className="text-destructive text-xs">
                                      {interfaceErrors[iface.id].runtimeId}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dependencies */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Dependencies</Label>
                      <Button
                        onClick={handleAddDependency}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Plus className="mr-1 size-3" />
                        Add
                      </Button>
                    </div>

                    {formData.dependencies.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No dependencies added yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {formData.dependencies.map((dep) => (
                          <div className="flex items-center gap-2" key={dep.id}>
                            <Input
                              onChange={(e) =>
                                handleDependencyChange(dep.id, e.target.value)
                              }
                              placeholder="dependency-name"
                              value={dep.name}
                            />
                            <Button
                              onClick={() => handleRemoveDependency(dep.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <SheetFooter className="flex-row justify-between gap-2 border-t pt-4">
          <SheetClose asChild>
            <Button
              disabled={isSubmitting}
              onClick={handleCancel}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={!isFormValid || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitButtonText}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

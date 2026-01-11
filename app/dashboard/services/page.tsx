"use client";

import { id } from "@instantdb/react";
import {
  Download,
  Globe,
  Package,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CommandPalette } from "@/components/command-palette";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ServiceTable } from "@/components/service-table";
import type { GroupedService } from "@/components/service-table/types";
import {
  calculateSearchScore,
  computeRuntimeFootprint,
  normalizeEnv,
  sortEnvironments,
} from "@/components/service-table/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";

const PAGE_TITLE = "Services";
const PAGE_DESCRIPTION =
  "Manage and track your deployed services across environments.";

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

interface ServiceInterface {
  id: string;
  domain: string;
  env: string;
  branch: string;
  runtimeType: string;
  runtimeId: string;
}

interface ServiceDependency {
  id: string;
  name: string;
}

interface CreateServiceFormData {
  name: string;
  owner: string;
  repository: string;
  interfaces: ServiceInterface[];
  dependencies: ServiceDependency[];
}

interface CreateServiceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingServiceNames: string[];
  onSubmit: (data: CreateServiceFormData) => Promise<void>;
  canCreate: boolean;
  editingService?: GroupedService | null;
}

function CreateServiceDrawer({
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

  // Validate name uniqueness
  const validateName = useCallback(
    (name: string): string | undefined => {
      const trimmed = name.trim();
      if (!trimmed) {
        return "Name is required";
      }
      // When editing, exclude the current service name from uniqueness check
      const otherServiceNames = isEditing
        ? existingServiceNames.filter((n) => n !== editingService?.name)
        : existingServiceNames;
      if (otherServiceNames.includes(trimmed)) {
        return "A service with this name already exists";
      }
      return undefined;
    },
    [existingServiceNames, isEditing, editingService]
  );

  // Validate URL
  const validateUrl = useCallback((url: string): string | undefined => {
    const trimmed = url.trim();
    if (!trimmed) {
      return "Repository URL is required";
    }
    try {
      new URL(trimmed);
      return undefined;
    } catch {
      return "Please enter a valid URL";
    }
  }, []);

  // Validate form
  const isFormValid = useMemo(() => {
    const nameError = validateName(formData.name);
    const ownerValid = formData.owner.trim().length > 0;
    const repoError = validateUrl(formData.repository);

    if (nameError || !ownerValid || repoError) {
      return false;
    }

    // Validate interfaces
    for (const iface of formData.interfaces) {
      if (!iface.domain.trim()) {
        return false;
      }
      if (iface.runtimeType && !iface.runtimeId.trim()) {
        return false;
      }
    }

    return true;
  }, [formData, validateName, validateUrl]);

  const handleFieldChange = (
    field: keyof CreateServiceFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate on change
    if (field === "name") {
      const error = validateName(value);
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
    const newErrors: Partial<Record<keyof ServiceInterface, string>> = {};

    if (field === "domain") {
      if (value.trim()) {
        // Check uniqueness within this service
        const duplicate = formData.interfaces.some(
          (i) => i.id !== id && i.domain.trim() === value.trim() && value.trim()
        );
        if (duplicate) {
          newErrors.domain = "Domain must be unique";
        }
      } else {
        newErrors.domain = "Domain is required";
      }
    }

    if (field === "runtimeType" && value && !updatedIface.runtimeId.trim()) {
      newErrors.runtimeId = "Runtime ID is required when Runtime Type is set";
    }

    if (field === "runtimeId" && updatedIface.runtimeType && !value.trim()) {
      newErrors.runtimeId = "Runtime ID is required when Runtime Type is set";
    }

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

/**
 * Converts InstantDB services data to GroupedService format for ServiceTable
 */
function convertServicesToGrouped(
  services: Array<{
    id: string;
    name: string;
    owner: string;
    repository: string;
    interfaces?: Array<{
      domain: string;
      env: string | null;
      branch: string | null;
      runtimeType: string | null;
      runtimeId: string | null;
    }>;
    dependencies?: Array<{
      dependencyName: string;
    }>;
  }>
): GroupedService[] {
  return services.map((service, serviceIndex) => {
    const environments: Array<{
      env: "production" | "staging" | "development";
      domain: string;
      branch: string | null;
      runtimeType: string | null;
      runtimeId: string | null;
    }> = [];

    if (service.interfaces && service.interfaces.length > 0) {
      for (const iface of service.interfaces) {
        if (iface.domain && iface.domain.trim().length > 0) {
          const normalizedEnv = normalizeEnv(iface.env);
          const env =
            normalizedEnv ??
            ("development" as "production" | "staging" | "development");

          environments.push({
            env,
            domain: iface.domain.trim(),
            branch: iface.branch?.trim() ?? null,
            runtimeType: iface.runtimeType?.trim() ?? null,
            runtimeId: iface.runtimeId?.trim() ?? null,
          });
        }
      }
    }

    const sortedEnvs = sortEnvironments(environments);

    return {
      id: service.id,
      serviceIndex,
      name: service.name,
      owner: service.owner,
      repository: service.repository,
      dependencies: service.dependencies?.map((d) => d.dependencyName) ?? [],
      environments: sortedEnvs,
      domainsCount: sortedEnvs.length,
      runtimeFootprint: computeRuntimeFootprint(sortedEnvs),
    };
  });
}

export default function ServicesPage() {
  const { user } = db.useAuth();
  const userId = user?.id && typeof user.id === "string" ? user.id : null;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [editingService, setEditingService] = useState<GroupedService | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Query user's organizations and memberships to check roles
  const { data: orgData } = db.useQuery(
    userId
      ? {
          members: {
            $: {
              where: { userId },
            },
            organization: {},
          },
        }
      : null
  );

  const members = orgData?.members || [];
  const organizations = members.map((m) => m.organization).filter(Boolean);
  const organizationIds =
    organizations.length > 0
      ? organizations
          .map((org) => org?.id)
          .filter(
            (orgId): orgId is string =>
              typeof orgId === "string" && orgId.length > 0
          )
      : [];

  // Check if user has editor/admin/owner role
  const canCreate = useMemo(() => {
    if (!members.length) {
      return false;
    }
    return members.some(
      (m) => m.role === "editor" || m.role === "admin" || m.role === "owner"
    );
  }, [members]);

  // Query services with interfaces and dependencies for user's organizations
  const { data: servicesData, isLoading } = db.useQuery(
    organizationIds.length > 0
      ? {
          services: {
            $: {
              where: {
                organizationId: { $in: organizationIds },
              },
            },
            interfaces: {},
            dependencies: {},
          },
        }
      : null
  );

  const rawServices = (servicesData?.services || []) as Array<{
    id: string;
    name: string;
    owner: string;
    repository: string;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
    interfaces?: Array<{
      domain: string;
      env: string | null;
      branch: string | null;
      runtimeType: string | null;
      runtimeId: string | null;
    }>;
    dependencies?: Array<{
      dependencyName: string;
    }>;
  }>;

  const groupedServices = useMemo(
    () => convertServicesToGrouped(rawServices),
    [rawServices]
  );

  const existingServiceNames = useMemo(
    () => rawServices.map((s) => s.name),
    [rawServices]
  );

  // Filter services based on search query
  const filteredGroupedServices = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedServices;
    }

    return groupedServices
      .map((service) => ({
        service,
        score: calculateSearchScore(service, searchQuery),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ service }) => service);
  }, [groupedServices, searchQuery]);

  const hasServices = groupedServices.length > 0;
  const hasFilteredServices = filteredGroupedServices.length > 0;

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateService = () => {
    if (canCreate) {
      setEditingService(null);
      setIsDrawerOpen(true);
    }
  };

  const handleEditService = useCallback(
    (service: GroupedService) => {
      if (canCreate) {
        setEditingService(service);
        setIsDrawerOpen(true);
      }
    },
    [canCreate]
  );

  const handleDeleteService = useCallback(
    async (service: GroupedService) => {
      if (!userId) {
        return;
      }

      try {
        // Delete service - cascades to interfaces and dependencies
        await db.transact([db.tx.services[service.id].delete()]);
      } catch (error) {
        console.error("Failed to delete service:", error);
        // TODO: Show error toast
      }
    },
    [userId]
  );

  const handleExportCsv = useCallback(() => {
    // Import and use the export function
    import("@/components/service-table/export").then(
      ({ exportServicesToCsv }) => {
        exportServicesToCsv(groupedServices);
      }
    );
  }, [groupedServices]);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        const input = searchInputRef.current;
        if (input) {
          input.focus();
        }
      }

      if (e.key === "Escape" && e.target === searchInputRef.current) {
        const input = searchInputRef.current;
        if (input) {
          input.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleServiceSubmit = async (data: CreateServiceFormData) => {
    if (!userId || organizationIds.length === 0) {
      return;
    }

    const organizationId = organizationIds[0];
    const isEditing = editingService !== null;

    if (isEditing && editingService) {
      // Update existing service
      const serviceId = editingService.id;

      // Update service
      const serviceTx = db.tx.services[serviceId].update({
        name: data.name,
        owner: data.owner,
        repository: data.repository,
        updatedAt: new Date(),
        updatedById: userId,
      });

      // Note: For a proper implementation, we should:
      // 1. Query existing interfaces and dependencies with their IDs
      // 2. Delete ones not in the new list
      // 3. Update ones that match
      // 4. Create new ones
      // For now, we'll just update the service and create new interfaces/dependencies
      // The old ones will remain (this is a simplified approach)

      // Create new interfaces
      const interfaceTxs = data.interfaces
        .filter((iface) => iface.domain.trim())
        .map((iface) => {
          const interfaceId = id();
          return db.tx.serviceInterfaces[interfaceId]
            .create({
              serviceId,
              domain: iface.domain.trim(),
              env: iface.env || "production",
              branch: iface.branch.trim() || null,
              runtimeType: iface.runtimeType || null,
              runtimeId: iface.runtimeId.trim() || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .link({ service: serviceId });
        });

      // Create new dependencies
      const dependencyTxs = data.dependencies
        .filter((dep) => dep.name.trim())
        .map((dep) => {
          const depId = id();
          return db.tx.serviceDependencies[depId]
            .create({
              serviceId,
              dependencyName: dep.name.trim(),
              createdAt: new Date(),
            })
            .link({ service: serviceId });
        });

      // TODO: Properly delete old interfaces and dependencies
      // For now, we'll just update the service and create new ones
      // This is a simplified approach - in production, you'd want to:
      // 1. Query existing interfaces/dependencies
      // 2. Delete ones not in the new list
      // 3. Update ones that match
      // 4. Create new ones
      await db.transact([serviceTx, ...interfaceTxs, ...dependencyTxs]);
    } else {
      // Create new service
      const serviceId = id();

      const serviceTx = db.tx.services[serviceId]
        .create({
          name: data.name,
          owner: data.owner,
          repository: data.repository,
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: userId,
          updatedById: userId,
        })
        .link({ organization: organizationId })
        .link({ creator: userId });

      const interfaceTxs = data.interfaces
        .filter((iface) => iface.domain.trim())
        .map((iface) => {
          const interfaceId = id();
          return db.tx.serviceInterfaces[interfaceId]
            .create({
              serviceId,
              domain: iface.domain.trim(),
              env: iface.env || "production",
              branch: iface.branch.trim() || null,
              runtimeType: iface.runtimeType || null,
              runtimeId: iface.runtimeId.trim() || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .link({ service: serviceId });
        });

      const dependencyTxs = data.dependencies
        .filter((dep) => dep.name.trim())
        .map((dep) => {
          const depId = id();
          return db.tx.serviceDependencies[depId]
            .create({
              serviceId,
              dependencyName: dep.name.trim(),
              createdAt: new Date(),
            })
            .link({ service: serviceId });
        });

      await db.transact([serviceTx, ...interfaceTxs, ...dependencyTxs]);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* PageHeader - Always visible */}
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground text-sm">{PAGE_DESCRIPTION}</p>
          </div>

          {/* PageToolbar - Only when services exist */}
          {hasServices && (
            <div className="flex h-11 items-center gap-2">
              {/* Search input - flex-1, full width flexible */}
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search services"
                  className="h-11 pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services…"
                  ref={searchInputRef}
                  value={searchQuery}
                />
              </div>

              {/* Actions cluster - icon-only buttons */}
              <div className="flex items-center gap-2">
                {/* CSV Export button - icon-only, ghost variant */}
                {hasFilteredServices && (
                  <Button
                    aria-label="Export to CSV"
                    className="h-11 w-11"
                    onClick={handleExportCsv}
                    size="icon"
                    variant="ghost"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}

                {/* Create service button - icon-only, primary */}
                {canCreate && (
                  <Button
                    aria-label="Create service"
                    className="h-11 w-11"
                    onClick={handleCreateService}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Content Area */}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
                (key) => (
                  <div
                    className="flex items-center gap-4 rounded-lg border bg-card p-4"
                    key={key}
                  >
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                  </div>
                )
              )}
            </div>
          )}

          {!isLoading && hasServices && (
            <ServiceTable
              onDelete={handleDeleteService}
              onEdit={handleEditService}
              services={filteredGroupedServices}
              showHeader={false}
              yamlContent=""
            />
          )}

          {!(isLoading || hasServices) && (
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No services yet</EmptyTitle>
                <EmptyDescription>
                  Services represent deployed software in your organization.
                  Create your first service to start building your deployment
                  inventory.
                </EmptyDescription>
              </EmptyHeader>
              {canCreate && (
                <EmptyContent>
                  <Button onClick={handleCreateService}>
                    <Plus className="mr-2 size-4" />
                    Create service
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}

          <CreateServiceDrawer
            canCreate={canCreate}
            editingService={editingService}
            existingServiceNames={existingServiceNames}
            onOpenChange={(open) => {
              setIsDrawerOpen(open);
              if (!open) {
                setEditingService(null);
              }
            }}
            onSubmit={handleServiceSubmit}
            open={isDrawerOpen}
          />

          <CommandPalette
            onOpenChange={setCommandPaletteOpen}
            onSearch={(query) => {
              // Search handled by ServiceTable internally
              console.log("Search:", query);
            }}
            open={commandPaletteOpen}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

import { id } from "@instantdb/react";
import type { db } from "@/lib/db";
import type { CreateServiceFormData } from "./types";

interface RawService {
  readonly id: string;
  readonly interfaces?: Array<{
    readonly id: string;
  }>;
  readonly dependencies?: Array<{
    readonly id: string;
  }>;
}

/**
 * Creates transactions for updating an existing service
 */
export function createUpdateServiceTransactions(
  dbInstance: typeof db,
  serviceId: string,
  userId: string,
  data: CreateServiceFormData,
  existingService: RawService
) {
  const existingInterfaces = existingService.interfaces || [];
  const existingDependencies = existingService.dependencies || [];

  // Update service
  const serviceTx = dbInstance.tx.services[serviceId].update({
    name: data.name,
    description: data.description.trim() || null,
    language: data.languages.length > 0 ? data.languages.join(",") : null,
    owner: data.owner,
    repository: data.repository,
    updatedAt: new Date(),
    updatedById: userId,
  });

  // Delete all existing interfaces and dependencies
  const deleteInterfaceTxs = existingInterfaces.map((iface) =>
    dbInstance.tx.serviceInterfaces[iface.id].delete()
  );
  const deleteDependencyTxs = existingDependencies.map((dep) =>
    dbInstance.tx.serviceDependencies[dep.id].delete()
  );

  // Create new interfaces
  const interfaceTxs = data.interfaces
    .filter((iface) => iface.domain.trim())
    .map((iface) => {
      const interfaceId = id();
      return dbInstance.tx.serviceInterfaces[interfaceId]
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
      return dbInstance.tx.serviceDependencies[depId]
        .create({
          serviceId,
          dependencyName: dep.name.trim(),
          createdAt: new Date(),
        })
        .link({ service: serviceId });
    });

  return [
    serviceTx,
    ...deleteInterfaceTxs,
    ...deleteDependencyTxs,
    ...interfaceTxs,
    ...dependencyTxs,
  ];
}

/**
 * Creates transactions for creating a new service
 */
export function createNewServiceTransactions(
  dbInstance: typeof db,
  organizationId: string,
  userId: string,
  data: CreateServiceFormData
) {
  const serviceId = id();

  const serviceTx = dbInstance.tx.services[serviceId]
    .create({
      name: data.name,
      description: data.description.trim() || null,
      language: data.languages.length > 0 ? data.languages.join(",") : null,
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
      return dbInstance.tx.serviceInterfaces[interfaceId]
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
      return dbInstance.tx.serviceDependencies[depId]
        .create({
          serviceId,
          dependencyName: dep.name.trim(),
          createdAt: new Date(),
        })
        .link({ service: serviceId });
    });

  return [serviceTx, ...interfaceTxs, ...dependencyTxs];
}

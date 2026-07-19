import { notFound } from "next/navigation";
import { EmployeeForm } from "../_components/employee-form";

import { getEmployee } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, "hr.employees.view")) {
        notFound();
    }

    const { id } = await params;
    const response = await getEmployee(id);

    if (!response.success) {
        notFound();
    }
    if (!response.data) {
        notFound();
    }

    const employee = SuperJSON.deserialize(response.data);
    const canEdit = hasPermission(session.permissions, "hr.employees.edit");

    return <EmployeeForm initialData={employee} isEditing canEdit={canEdit} />;
}

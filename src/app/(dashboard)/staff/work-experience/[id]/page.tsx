import { getRabatAllowanceStudent } from "@/actions/work-experience-allowance"
import { notFound } from "next/navigation"
import { WorkExperienceStudentDetail } from "./work-experience-student-detail"

export default async function WorkExperienceStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let student
  try {
    student = await getRabatAllowanceStudent(id)
  } catch {
    notFound()
  }
  return <WorkExperienceStudentDetail initialStudent={student} />
}

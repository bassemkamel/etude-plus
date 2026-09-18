import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * StudentGrades — redirects to the new StudentProgress page.
 * All grade/performance tracking has been consolidated into /student/progress.
 */
export function StudentGrades() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/student/progress");
  }, []);

  return null;
}

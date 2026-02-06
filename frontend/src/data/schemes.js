// Mock data for demonstration - Replace with actual API calls
export const mockSchemes = [
  {
    id: "scheme_1",
    name: "National Scholarship for Higher Education",
    state: "ALL",
    category: "ALL",
    income_max: 250000,
    age_min: 17,
    age_max: 25,
    benefits: "Full tuition fee reimbursement up to ₹50,000 per year plus ₹10,000 annual book allowance for undergraduate students.",
    documents: ["Aadhaar Card", "Income Certificate", "Previous Year Marksheet", "Bank Passbook", "College Admission Letter"],
    apply_link: "https://scholarships.gov.in"
  },
  {
    id: "scheme_2",
    name: "PM YASASVI Scholarship",
    state: "ALL",
    category: "OBC",
    income_max: 250000,
    age_min: 15,
    age_max: 25,
    benefits: "Annual scholarship of ₹75,000 for Class 9-10 students and ₹1,25,000 for Class 11-12 students from OBC, EBC, and DNT categories.",
    documents: ["Caste Certificate", "Income Certificate", "Aadhaar Card", "School Bonafide", "Parent ID Proof"],
    apply_link: "https://yet.nta.ac.in"
  },
  {
    id: "scheme_3",
    name: "Post Matric Scholarship for SC Students",
    state: "ALL",
    category: "SC",
    income_max: 300000,
    age_min: 15,
    age_max: 35,
    benefits: "Complete tuition and examination fees covered, plus monthly maintenance allowance of ₹550-1200 based on course level.",
    documents: ["Caste Certificate", "Income Certificate", "Previous Marksheet", "Aadhaar Card", "Bank Account Details"],
    apply_link: "https://scholarships.gov.in"
  },
  {
    id: "scheme_4",
    name: "Maharashtra State Merit Scholarship",
    state: "Maharashtra",
    category: "ALL",
    income_max: 800000,
    age_min: 16,
    age_max: 25,
    benefits: "Merit-based scholarship of ₹5,000-25,000 per year for students scoring above 75% in board exams.",
    documents: ["Domicile Certificate", "Marksheet", "Income Certificate", "Aadhaar Card"],
    apply_link: "https://mahadbt.maharashtra.gov.in"
  },
  {
    id: "scheme_5",
    name: "Karnataka Vidyasiri Scholarship",
    state: "Karnataka",
    category: "ALL",
    income_max: 200000,
    age_min: 17,
    age_max: 25,
    benefits: "Annual scholarship ranging from ₹11,000 to ₹50,000 based on course for students from economically weaker sections.",
    documents: ["Income Certificate", "Caste Certificate", "Aadhaar Card", "College ID", "Fee Receipt"],
    apply_link: "https://karepass.karnataka.gov.in"
  },
  {
    id: "scheme_6",
    name: "Central Sector Scholarship for College Students",
    state: "ALL",
    category: "ALL",
    income_max: 450000,
    age_min: 17,
    age_max: 25,
    benefits: "₹12,000 per annum for graduation (first 3 years), ₹20,000 for post-graduation. Top 20 percentile of 12th board students.",
    documents: ["12th Marksheet", "Income Certificate", "Aadhaar Card", "Bank Details", "College Admission Proof"],
    apply_link: "https://scholarships.gov.in"
  },
  {
    id: "scheme_7",
    name: "Pragati Scholarship for Girl Students",
    state: "ALL",
    category: "ALL",
    income_max: 800000,
    age_min: 17,
    age_max: 30,
    benefits: "₹50,000 per year for girl students pursuing technical education. Only 2 girls per family eligible.",
    documents: ["Aadhaar Card", "Income Certificate", "Previous Marksheet", "Bank Account", "Institute Bonafide"],
    apply_link: "https://aicte-pragati-saksham-gov.in"
  },
  {
    id: "scheme_8",
    name: "UP Scholarship for Minority Students",
    state: "Uttar Pradesh",
    category: "Minority",
    income_max: 200000,
    age_min: 14,
    age_max: 30,
    benefits: "Full fee reimbursement for minority community students including Muslims, Christians, Sikhs, Buddhists, and Parsis.",
    documents: ["Minority Certificate", "Income Certificate", "Aadhaar", "Previous Marksheet", "Bank Passbook"],
    apply_link: "https://scholarship.up.gov.in"
  },
  {
    id: "scheme_9",
    name: "Pre Matric Scholarship for ST Students",
    state: "ALL",
    category: "ST",
    income_max: 200000,
    age_min: 10,
    age_max: 18,
    benefits: "Monthly stipend of ₹150-350 for day scholars and ₹500-750 for hostellers studying in Class 9-10.",
    documents: ["Tribe Certificate", "Income Certificate", "School ID", "Aadhaar Card", "Parent Bank Account"],
    apply_link: "https://scholarships.gov.in"
  },
  {
    id: "scheme_10",
    name: "Tamil Nadu Free Education Scheme",
    state: "Tamil Nadu",
    category: "ALL",
    income_max: 500000,
    age_min: 6,
    age_max: 25,
    benefits: "Complete fee waiver in government schools and colleges plus free textbooks, uniforms, and mid-day meals.",
    documents: ["Community Certificate", "Income Certificate", "Aadhaar Card", "School Bonafide"],
    apply_link: "https://tnscholarships.gov.in"
  }
];

// Indian states for dropdown
export const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh"
];

// Categories for dropdown
export const categories = ["General", "SC", "ST", "OBC", "EWS", "Minority"];

// Eligibility check function
export const checkEligibility = (userProfile, scheme) => {
  const reasons = [];
  
  // Check age
  if (userProfile.age < scheme.age_min || userProfile.age > scheme.age_max) {
    return { eligible: false, reason: `Age must be between ${scheme.age_min}-${scheme.age_max}` };
  }
  reasons.push(`Age ${userProfile.age} is within ${scheme.age_min}-${scheme.age_max} range`);
  
  // Check income
  if (userProfile.income > scheme.income_max) {
    return { eligible: false, reason: `Income must be below ₹${scheme.income_max.toLocaleString()}` };
  }
  reasons.push(`Income ₹${userProfile.income.toLocaleString()} is below limit`);
  
  // Check category
  if (scheme.category !== "ALL" && scheme.category !== userProfile.category) {
    return { eligible: false, reason: `This scheme is for ${scheme.category} category only` };
  }
  if (scheme.category !== "ALL") {
    reasons.push(`${userProfile.category} category matches`);
  }
  
  // Check state
  if (scheme.state !== "ALL" && scheme.state !== userProfile.state) {
    return { eligible: false, reason: `This scheme is only for ${scheme.state}` };
  }
  if (scheme.state !== "ALL") {
    reasons.push(`${userProfile.state} state matches`);
  }
  
  return { eligible: true, reason: reasons.join(" • ") };
};

// Get eligible schemes for user
export const getEligibleSchemes = (userProfile) => {
  return mockSchemes
    .map(scheme => {
      const { eligible, reason } = checkEligibility(userProfile, scheme);
      return eligible ? { ...scheme, eligibilityReason: reason } : null;
    })
    .filter(Boolean);
};

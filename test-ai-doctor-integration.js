/**
 * AI Symptom Analyzer → Doctor Recommendation Integration Test
 * 
 * This demonstrates how the system works:
 * 1. Patient enters symptoms in AI Symptom Checker
 * 2. AI analyzes symptoms and recommends specializations
 * 3. When patient clicks "Find Doctors", recommended specialists appear first
 * 4. Location-based sorting shows nearest doctors within each specialization
 */

// Test data simulating AI symptom analysis response
const exampleSymptomAnalysis = {
  symptoms: "I have chest pain and difficulty breathing",
  aiResponse: {
    recommendedSpecializations: [
      "Cardiology",
      "Pulmonology", 
      "Emergency Medicine"
    ],
    severity: "high",
    urgencyLevel: "Schedule appointment for proper evaluation"
  }
};

// Test data simulating available doctors
const mockDoctors = [
  {
    id: "1",
    name: "Dr. Sarah Wilson",
    specialization: "Dermatology",
    rating: 4.8,
    consultationFee: 300,
    location: { distance: 2.5, lat: 19.0760, lng: 72.8777 }
  },
  {
    id: "2", 
    name: "Dr. Michael Chen",
    specialization: "Cardiology", // This matches AI recommendation
    rating: 4.9,
    consultationFee: 500,
    location: { distance: 1.2, lat: 19.0770, lng: 72.8780 }
  },
  {
    id: "3",
    name: "Dr. Lisa Rodriguez", 
    specialization: "Pulmonology", // This matches AI recommendation
    rating: 4.7,
    consultationFee: 450,
    location: { distance: 3.1, lat: 19.0750, lng: 72.8770 }
  },
  {
    id: "4",
    name: "Dr. James Kumar",
    specialization: "Orthopedics",
    rating: 4.6,
    consultationFee: 350,
    location: { distance: 0.8, lat: 19.0780, lng: 72.8790 }
  }
];

// Algorithm: How doctors are prioritized
function prioritizeDoctors(doctors, recommendedSpecializations) {
  return doctors.sort((a, b) => {
    // 1. First priority: AI recommended specializations
    const aIsRecommended = recommendedSpecializations.some(spec => 
      a.specialization.toLowerCase().includes(spec.toLowerCase())
    );
    const bIsRecommended = recommendedSpecializations.some(spec => 
      b.specialization.toLowerCase().includes(spec.toLowerCase())
    );
    
    if (aIsRecommended && !bIsRecommended) return -1;
    if (!aIsRecommended && bIsRecommended) return 1;
    
    // 2. Second priority: Distance (nearest first)
    return a.location.distance - b.location.distance;
  });
}

// Test the prioritization
console.log("🔍 Original doctor list:");
mockDoctors.forEach((doc, i) => {
  console.log(`${i+1}. ${doc.name} (${doc.specialization}) - ${doc.location.distance}km`);
});

console.log("\n🎯 After AI recommendation prioritization:");
const prioritized = prioritizeDoctors(mockDoctors, exampleSymptomAnalysis.aiResponse.recommendedSpecializations);
prioritized.forEach((doc, i) => {
  const isRecommended = exampleSymptomAnalysis.aiResponse.recommendedSpecializations.some(spec => 
    doc.specialization.toLowerCase().includes(spec.toLowerCase())
  );
  const icon = isRecommended ? "⭐" : "  ";
  console.log(`${i+1}. ${icon} ${doc.name} (${doc.specialization}) - ${doc.location.distance}km`);
});

console.log("\n💡 Integration Flow:");
console.log("1. Patient: 'I have chest pain and difficulty breathing'");
console.log("2. AI Analysis: Recommends Cardiology, Pulmonology, Emergency Medicine");
console.log("3. Doctor Search: Cardiology and Pulmonology doctors appear first");
console.log("4. Location Sort: Within each specialization, nearest doctors shown first");

module.exports = {
  prioritizeDoctors,
  exampleSymptomAnalysis,
  mockDoctors
}; 
export type LabTestCatalogItem = {
  code: string;
  name: string;
  category: string;
  aliases: string[];
};

const groups: Record<string, string[]> = {
  "Haematology": [
    "Complete Blood Count (CBC)", "Haemogram", "Haemoglobin", "Haematocrit (PCV)",
    "Red Blood Cell Count", "Total Leukocyte Count", "Differential Leukocyte Count",
    "Absolute Neutrophil Count", "Absolute Lymphocyte Count", "Absolute Eosinophil Count",
    "Absolute Monocyte Count", "Platelet Count", "Mean Platelet Volume", "Reticulocyte Count",
    "Erythrocyte Sedimentation Rate (ESR)", "Peripheral Blood Smear", "Malarial Parasite Smear",
    "Sickling Test", "Osmotic Fragility Test", "G6PD Quantitative", "HbH Inclusion Bodies",
    "Foetal Haemoglobin (HbF)", "Haemoglobin Electrophoresis / HPLC", "Thalassaemia Screening Profile",
    "Red Cell Indices", "Immature Reticulocyte Fraction", "Immature Platelet Fraction",
    "Leucocyte Alkaline Phosphatase Score", "Bone Marrow Aspiration Examination",
    "Bone Marrow Biopsy Examination", "Flow Cytometry - Leukaemia / Lymphoma Panel",
  ],
  "Coagulation": [
    "Prothrombin Time (PT) with INR", "Activated Partial Thromboplastin Time (aPTT)",
    "Thrombin Time", "Fibrinogen", "D-Dimer", "Bleeding Time", "Clotting Time",
    "Factor VIII Assay", "Factor IX Assay", "Factor XI Assay", "Factor XIII Screening",
    "Von Willebrand Factor Antigen", "Von Willebrand Factor Activity", "Lupus Anticoagulant",
    "Protein C Activity", "Protein S Activity", "Antithrombin III Activity", "APC Resistance",
    "Mixing Study", "Platelet Function Analysis", "FDP (Fibrin Degradation Products)",
  ],
  "Diabetes": [
    "Glucose - Fasting", "Glucose - Post Prandial", "Glucose - Random", "HbA1c",
    "Oral Glucose Tolerance Test (OGTT)", "Glucose Challenge Test", "Fasting Insulin",
    "Post Prandial Insulin", "C-Peptide - Fasting", "C-Peptide - Post Prandial",
    "Fructosamine", "Urine Glucose", "Urine Ketones", "Beta-Hydroxybutyrate",
    "Diabetes Autoimmune Profile", "Insulin Antibody", "GAD-65 Antibody", "IA-2 Antibody",
  ],
  "Renal & Electrolytes": [
    "Kidney Function Test (KFT / RFT)", "Blood Urea Nitrogen (BUN)", "Urea", "Creatinine",
    "eGFR", "Uric Acid", "Sodium", "Potassium", "Chloride", "Bicarbonate",
    "Calcium - Total", "Calcium - Ionised", "Phosphorus", "Magnesium", "Serum Osmolality",
    "Urine Osmolality", "Urine Sodium", "Urine Potassium", "Urine Creatinine - Spot",
    "Urine Protein - 24 Hour", "Urine Creatinine - 24 Hour", "Creatinine Clearance Test",
    "Urine Microalbumin", "Urine Albumin/Creatinine Ratio", "Urine Protein/Creatinine Ratio",
    "Cystatin C", "Stone Analysis", "Renal Calculus Risk Profile",
  ],
  "Liver & Pancreas": [
    "Liver Function Test (LFT)", "Bilirubin - Total", "Bilirubin - Direct", "Bilirubin - Indirect",
    "AST (SGOT)", "ALT (SGPT)", "Alkaline Phosphatase (ALP)", "Gamma GT (GGT)",
    "Total Protein", "Albumin", "Globulin", "Albumin/Globulin Ratio", "LDH",
    "Serum Cholinesterase", "Ammonia", "Amylase", "Lipase", "Pancreatic Amylase",
    "FibroTest / Liver Fibrosis Profile", "Ceruloplasmin", "Alpha-1 Antitrypsin",
  ],
  "Lipids & Cardiac": [
    "Lipid Profile", "Total Cholesterol", "Triglycerides", "HDL Cholesterol",
    "LDL Cholesterol - Direct", "VLDL Cholesterol", "Non-HDL Cholesterol", "Apolipoprotein A1",
    "Apolipoprotein B", "Apo B/A1 Ratio", "Lipoprotein(a)", "hs-CRP", "Homocysteine",
    "Troponin I - High Sensitivity", "Troponin T - High Sensitivity", "CK-MB", "Total CK / CPK",
    "NT-proBNP", "BNP", "Myoglobin", "Lipoprotein-Associated Phospholipase A2",
    "PLAC Test", "Cardiac Risk Profile", "Ischaemia Modified Albumin",
  ],
  "Thyroid": [
    "Thyroid Profile - Total (T3, T4, TSH)", "Thyroid Profile - Free (FT3, FT4, TSH)",
    "TSH - Ultrasensitive", "Total T3", "Total T4", "Free T3", "Free T4",
    "Anti-Thyroid Peroxidase Antibody (Anti-TPO)", "Anti-Thyroglobulin Antibody",
    "TSH Receptor Antibody (TRAb)", "Thyroid Stimulating Immunoglobulin",
    "Thyroglobulin", "Calcitonin", "Reverse T3", "Thyroxine Binding Globulin",
  ],
  "Hormones & Fertility": [
    "Beta hCG - Quantitative", "Beta hCG - Qualitative", "Luteinising Hormone (LH)",
    "Follicle Stimulating Hormone (FSH)", "Prolactin", "Estradiol (E2)", "Progesterone",
    "Testosterone - Total", "Testosterone - Free", "Sex Hormone Binding Globulin (SHBG)",
    "DHEA-S", "Androstenedione", "17-Hydroxyprogesterone", "Anti-Mullerian Hormone (AMH)",
    "Inhibin B", "Cortisol - Morning", "Cortisol - Evening", "Cortisol - 24 Hour Urine",
    "ACTH", "Growth Hormone", "IGF-1", "Parathyroid Hormone (PTH)", "Aldosterone",
    "Plasma Renin Activity", "Aldosterone/Renin Ratio", "Metanephrine - Plasma",
    "Metanephrine - 24 Hour Urine", "Catecholamines - Plasma", "Catecholamines - 24 Hour Urine",
    "Semen Analysis", "Sperm DNA Fragmentation", "Post-Coital Test",
  ],
  "Pregnancy & Prenatal": [
    "Pregnancy Test - Urine", "First Trimester Double Marker", "Second Trimester Triple Marker",
    "Second Trimester Quadruple Marker", "PAPP-A", "Maternal Serum AFP", "Inhibin A",
    "Non-Invasive Prenatal Testing (NIPT)", "TORCH IgG Profile", "TORCH IgM Profile",
    "Rubella IgG", "Rubella IgM", "Cytomegalovirus IgG", "Cytomegalovirus IgM",
    "Toxoplasma IgG", "Toxoplasma IgM", "Herpes Simplex Virus 1 & 2 IgG",
    "Herpes Simplex Virus 1 & 2 IgM", "Indirect Coombs Test", "Foetal Fibronectin",
  ],
  "Vitamins, Iron & Nutrition": [
    "Vitamin D 25-OH", "Vitamin D 1,25-Dihydroxy", "Vitamin B12", "Folate",
    "Vitamin A", "Vitamin B1 (Thiamine)", "Vitamin B2 (Riboflavin)", "Vitamin B6",
    "Vitamin C", "Vitamin E", "Vitamin K", "Iron", "Ferritin", "TIBC",
    "UIBC", "Transferrin", "Transferrin Saturation", "Soluble Transferrin Receptor",
    "Zinc", "Copper", "Selenium", "Prealbumin", "Methylmalonic Acid",
  ],
  "Immunology & Autoimmune": [
    "C-Reactive Protein (CRP)", "Rheumatoid Factor", "Anti-CCP Antibody", "ANA by IFA",
    "ANA Profile / Immunoblot", "Anti-dsDNA Antibody", "ENA Profile", "Complement C3",
    "Complement C4", "Total Complement (CH50)", "c-ANCA (PR3)", "p-ANCA (MPO)",
    "Antiphospholipid Antibody Panel", "Anticardiolipin IgG", "Anticardiolipin IgM",
    "Beta-2 Glycoprotein 1 IgG", "Beta-2 Glycoprotein 1 IgM", "ASO Titre",
    "Anti-GBM Antibody", "Anti-Mitochondrial Antibody", "Anti-Smooth Muscle Antibody",
    "Liver Kidney Microsomal Antibody", "Tissue Transglutaminase IgA", "Tissue Transglutaminase IgG",
    "Deamidated Gliadin Peptide IgA", "Deamidated Gliadin Peptide IgG", "Total IgA",
    "Immunoglobulin IgG", "Immunoglobulin IgM", "Immunoglobulin IgE - Total",
    "IgG Subclasses", "Serum Protein Electrophoresis", "Immunofixation Electrophoresis",
    "Serum Free Light Chains", "Cryoglobulins", "HLA-B27", "HLA-B51",
  ],
  "Allergy": [
    "Allergy Screen - Inhalant", "Allergy Screen - Food", "Allergen Specific IgE",
    "Food Allergy Panel", "Inhalant Allergy Panel", "Paediatric Allergy Panel",
    "Aspergillus Specific IgE", "Milk Specific IgE", "Egg White Specific IgE",
    "Wheat Specific IgE", "Peanut Specific IgE", "Dust Mite Specific IgE",
  ],
  "Infectious Diseases": [
    "HIV 1 & 2 Antigen/Antibody (4th Generation)", "HIV-1 RNA Viral Load", "HIV-1 DNA PCR",
    "CD4/CD8 Count", "HBsAg", "Hepatitis B Surface Antibody (Anti-HBs)",
    "Hepatitis B Core Antibody - Total", "Hepatitis B Core Antibody - IgM", "HBeAg",
    "Anti-HBe", "HBV DNA Viral Load", "Hepatitis C Antibody (Anti-HCV)", "HCV RNA Viral Load",
    "HCV Genotyping", "Hepatitis A IgM", "Hepatitis A Total Antibody", "Hepatitis E IgM",
    "Hepatitis E IgG", "Dengue NS1 Antigen", "Dengue IgM", "Dengue IgG",
    "Dengue RT-PCR", "Chikungunya IgM", "Chikungunya RT-PCR", "Malaria Antigen",
    "Malaria Parasite QBC", "Widal Test", "Typhidot IgM", "Salmonella Typhi IgM",
    "Leptospira IgM", "Scrub Typhus IgM", "Weil-Felix Test", "Brucella Agglutination Test",
    "VDRL / RPR", "TPHA", "Treponema Pallidum Antibody", "HSV-1 IgG", "HSV-1 IgM",
    "HSV-2 IgG", "HSV-2 IgM", "COVID-19 RT-PCR", "COVID-19 Rapid Antigen",
    "SARS-CoV-2 IgG Antibody", "Influenza A & B RT-PCR", "H1N1 RT-PCR",
    "Respiratory Pathogen PCR Panel", "EBV VCA IgM", "EBV VCA IgG", "EBV DNA PCR",
    "CMV DNA PCR", "Varicella Zoster IgG", "Varicella Zoster IgM", "Measles IgG",
    "Mumps IgG", "Parvovirus B19 IgM", "Parvovirus B19 PCR", "Japanese Encephalitis IgM",
    "Rickettsial Fever Panel", "Kala-Azar rk39 Antibody", "Filariasis Antigen",
  ],
  "Tuberculosis": [
    "AFB Smear", "AFB Culture", "Mycobacterium Tuberculosis Culture (MGIT)",
    "GeneXpert MTB/RIF", "Truenat MTB", "Truenat MTB Plus", "Truenat MTB-RIF Dx",
    "TB Interferon Gamma Release Assay (IGRA)", "Mantoux Test", "TB PCR",
    "Mycobacterial Identification", "Mycobacterial Drug Susceptibility Testing",
    "Line Probe Assay - First Line TB", "Line Probe Assay - Second Line TB",
  ],
  "Microbiology": [
    "Blood Culture and Sensitivity", "Urine Culture and Sensitivity", "Stool Culture and Sensitivity",
    "Sputum Culture and Sensitivity", "Throat Swab Culture", "Nasal Swab Culture",
    "Pus Culture and Sensitivity", "Wound Swab Culture", "High Vaginal Swab Culture",
    "Endocervical Swab Culture", "Semen Culture", "CSF Culture", "Body Fluid Culture",
    "Fungal Culture", "KOH Mount for Fungus", "Gram Stain", "India Ink Preparation",
    "Cryptococcal Antigen", "Clostridioides difficile Toxin", "Rotavirus Antigen",
    "Helicobacter pylori Stool Antigen", "Helicobacter pylori Urea Breath Test",
    "Gonorrhoea NAAT", "Chlamydia trachomatis NAAT", "STI Multiplex PCR Panel",
    "Bacterial Vaginosis Panel", "HPV DNA - High Risk", "HPV Genotyping",
  ],
  "Urine, Stool & Body Fluids": [
    "Urine Routine and Microscopy", "Urine Complete Examination", "Urine Bile Salts and Pigments",
    "Urine Urobilinogen", "Urine Bence Jones Protein", "Urine Myoglobin", "Urine Drug Screen",
    "Stool Routine and Microscopy", "Stool Occult Blood", "Stool Ova and Parasites",
    "Stool Reducing Substances", "Stool Calprotectin", "Stool Pancreatic Elastase",
    "Faecal Fat", "CSF Routine Examination", "CSF Protein", "CSF Glucose",
    "Pleural Fluid Analysis", "Ascitic Fluid Analysis", "Synovial Fluid Analysis",
    "Pericardial Fluid Analysis", "Body Fluid Cell Count", "Body Fluid ADA",
    "Body Fluid Cytology", "Semen Fructose", "Sweat Chloride Test",
  ],
  "Tumour Markers": [
    "PSA - Total", "PSA - Free", "Free/Total PSA Ratio", "Alpha-Fetoprotein (AFP)",
    "Carcinoembryonic Antigen (CEA)", "CA-125", "HE4", "ROMA Index", "CA 19-9",
    "CA 15-3", "CA 72-4", "Beta-2 Microglobulin", "Beta hCG - Tumour Marker",
    "SCC Antigen", "Neuron Specific Enolase", "Chromogranin A", "ProGRP",
    "Thyroglobulin - Tumour Marker", "Calcitonin - Tumour Marker", "LDH - Tumour Marker",
    "PIVKA-II", "PCA3", "Bladder Tumour Antigen", "Multiple Myeloma Profile",
  ],
  "Histopathology & Cytology": [
    "Histopathology - Small Biopsy", "Histopathology - Medium Specimen",
    "Histopathology - Large Specimen", "Histopathology - Radical Resection",
    "Frozen Section", "Immunohistochemistry Panel", "Direct Immunofluorescence - Biopsy",
    "Pap Smear - Conventional", "Pap Smear - Liquid Based Cytology", "FNAC Cytology",
    "Fluid Cytology", "Sputum Cytology", "Urine Cytology", "Cell Block Preparation",
    "Bone Marrow Trephine Histopathology", "ER/PR/HER2 Breast Cancer Panel",
    "PD-L1 Immunohistochemistry", "Mismatch Repair Protein IHC", "Ki-67 IHC",
  ],
  "Molecular & Genetics": [
    "Karyotyping", "FISH - Constitutional", "FISH - Oncology", "Chromosomal Microarray",
    "Clinical Exome Sequencing", "Whole Exome Sequencing", "Whole Genome Sequencing",
    "Carrier Screening Panel", "BRCA1 and BRCA2 Gene Test", "Hereditary Cancer Panel",
    "Thalassaemia Mutation Analysis", "Fragile X Mutation Analysis", "Spinal Muscular Atrophy Test",
    "Duchenne Muscular Dystrophy Test", "Cystic Fibrosis Mutation Analysis", "HLA Typing",
    "HLA-B27 by PCR", "BCR-ABL Quantitative PCR", "JAK2 V617F Mutation", "CALR Mutation",
    "MPL Mutation", "PML-RARA PCR", "FLT3 Mutation", "NPM1 Mutation", "EGFR Mutation",
    "KRAS Mutation", "NRAS Mutation", "BRAF Mutation", "ALK Rearrangement", "ROS1 Rearrangement",
    "Microsatellite Instability Test", "Minimal Residual Disease - Leukaemia",
  ],
  "Therapeutic Drug Monitoring & Toxicology": [
    "Tacrolimus Level", "Cyclosporine Level", "Sirolimus Level", "Everolimus Level",
    "Digoxin Level", "Lithium Level", "Valproic Acid Level", "Carbamazepine Level",
    "Phenytoin Level", "Phenobarbital Level", "Theophylline Level", "Vancomycin Level",
    "Methotrexate Level", "Paracetamol Level", "Salicylate Level", "Blood Alcohol Level",
    "Blood Lead Level", "Mercury Level", "Arsenic Level", "Cholinesterase - Pesticide Exposure",
    "Urine Toxicology Screen", "Drugs of Abuse Panel", "Nicotine / Cotinine Test",
  ],
};

const commonAliases: Record<string, string[]> = {
  "Complete Blood Count (CBC)": ["CBC", "complete haemogram", "complete hemogram"],
  "Haemogram": ["hemogram", "CBC with ESR"],
  "Prothrombin Time (PT) with INR": ["PT INR", "INR"],
  "Activated Partial Thromboplastin Time (aPTT)": ["APTT", "PTTK"],
  "Glucose - Fasting": ["FBS", "fasting blood sugar"],
  "Glucose - Post Prandial": ["PPBS", "post meal sugar"],
  "Glucose - Random": ["RBS", "random blood sugar"],
  "HbA1c": ["glycated haemoglobin", "glycosylated hemoglobin"],
  "Kidney Function Test (KFT / RFT)": ["KFT", "RFT", "renal function test"],
  "Liver Function Test (LFT)": ["LFT", "hepatic function panel"],
  "AST (SGOT)": ["AST", "SGOT"],
  "ALT (SGPT)": ["ALT", "SGPT"],
  "Lipid Profile": ["lipid panel", "cholesterol profile"],
  "Thyroid Profile - Total (T3, T4, TSH)": ["TFT", "thyroid function test"],
  "TSH - Ultrasensitive": ["TSH", "uTSH"],
  "Beta hCG - Quantitative": ["beta HCG", "pregnancy hormone"],
  "Vitamin D 25-OH": ["25 hydroxy vitamin D", "vitamin D3"],
  "C-Reactive Protein (CRP)": ["CRP"],
  "Rheumatoid Factor": ["RF"],
  "ANA by IFA": ["ANA", "antinuclear antibody"],
  "HIV 1 & 2 Antigen/Antibody (4th Generation)": ["HIV duo", "HIV combo"],
  "HBsAg": ["Australia antigen", "hepatitis B surface antigen"],
  "Hepatitis C Antibody (Anti-HCV)": ["anti HCV", "HCV antibody"],
  "GeneXpert MTB/RIF": ["CBNAAT", "Xpert MTB RIF"],
  "TB Interferon Gamma Release Assay (IGRA)": ["Quantiferon TB", "TB gold"],
  "Urine Routine and Microscopy": ["urine R/M", "urine RE", "urinalysis"],
  "Stool Routine and Microscopy": ["stool R/M", "stool RE"],
  "Pap Smear - Liquid Based Cytology": ["LBC", "liquid based pap"],
};

function codeFor(category: string, name: string, index: number) {
  const prefix = category.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
  return `IN-${prefix}-${String(index + 1).padStart(3, "0")}-${name.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

export const labTestCatalog: LabTestCatalogItem[] = Object.entries(groups).flatMap(([category, tests]) =>
  tests.map((name, index) => ({ code: codeFor(category, name, index), name, category, aliases: commonAliases[name] || [] })),
);

export function searchLabTests(query: string, limit = 20, catalog = labTestCatalog) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return catalog.slice(0, limit);
  return catalog
    .map((item) => {
      const name = item.name.toLocaleLowerCase();
      const category = item.category.toLocaleLowerCase();
      const aliases = item.aliases.join(" ").toLocaleLowerCase();
      const haystack = `${name} ${category} ${aliases}`;
      if (!terms.every((term) => haystack.includes(term))) return null;
      const exactAlias = item.aliases.some((alias) => alias.toLocaleLowerCase() === query.toLocaleLowerCase().trim());
      const score = name === query.toLocaleLowerCase().trim() ? 0 : exactAlias ? 1 : name.startsWith(terms[0]) ? 2 : 3;
      return { item, score };
    })
    .filter((result): result is { item: LabTestCatalogItem; score: number } => result !== null)
    .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((result) => result.item);
}

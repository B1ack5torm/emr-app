export type ImagingCatalogItem = {
  code: string;
  name: string;
  modality: string;
  bodyPart: string;
  description: string;
  aliases: string[];
};

type Procedure = [name: string, bodyPart: string];

const groups: Record<string, Procedure[]> = {
  "X-Ray": [
    ["Chest X-ray, 1 view", "Chest"], ["Chest X-ray, 2 views", "Chest"], ["Chest X-ray, PA view", "Chest"],
    ["Chest X-ray, AP portable", "Chest"], ["Chest X-ray, lateral view", "Chest"], ["Chest X-ray, decubitus view", "Chest"],
    ["Abdomen X-ray, supine", "Abdomen"], ["Abdomen X-ray, erect", "Abdomen"], ["Abdomen X-ray, 2 views", "Abdomen"],
    ["Acute abdominal series", "Chest and abdomen"], ["KUB X-ray", "Kidneys, ureters and bladder"],
    ["Skull X-ray, 2 views", "Skull"], ["Paranasal sinus X-ray", "Paranasal sinuses"], ["Nasal bone X-ray", "Nasal bones"],
    ["Facial bones X-ray", "Facial bones"], ["Mandible X-ray", "Mandible"], ["Neck soft tissue X-ray", "Neck"],
    ["Cervical spine X-ray, 2 views", "Cervical spine"], ["Cervical spine X-ray, flexion and extension", "Cervical spine"],
    ["Thoracic spine X-ray, 2 views", "Thoracic spine"], ["Lumbar spine X-ray, 2 views", "Lumbar spine"],
    ["Lumbosacral spine X-ray, 2 views", "Lumbosacral spine"], ["Sacrum and coccyx X-ray", "Sacrum and coccyx"],
    ["Scoliosis study, whole spine", "Whole spine"], ["Pelvis X-ray, AP view", "Pelvis"], ["Hip X-ray, unilateral", "Hip"],
    ["Hips X-ray, bilateral", "Hips"], ["Femur X-ray", "Femur"], ["Knee X-ray, 2 views", "Knee"],
    ["Knee X-ray, standing AP", "Knees"], ["Patella X-ray, skyline view", "Patella"], ["Tibia and fibula X-ray", "Lower leg"],
    ["Ankle X-ray, 3 views", "Ankle"], ["Foot X-ray, 3 views", "Foot"], ["Calcaneum X-ray", "Heel"],
    ["Shoulder X-ray, 2 views", "Shoulder"], ["Clavicle X-ray", "Clavicle"], ["Humerus X-ray", "Humerus"],
    ["Elbow X-ray, 2 views", "Elbow"], ["Forearm X-ray", "Forearm"], ["Wrist X-ray, 3 views", "Wrist"],
    ["Hand X-ray, 3 views", "Hand"], ["Finger X-ray", "Finger"], ["Bone age X-ray", "Left hand and wrist"],
    ["Skeletal survey - adult", "Whole skeleton"], ["Skeletal survey - paediatric", "Whole skeleton"],
    ["Ribs X-ray, unilateral", "Ribs"], ["Sternum X-ray", "Sternum"], ["Temporomandibular joints X-ray", "TM joints"],
  ],
  "Ultrasound": [
    ["Ultrasound abdomen complete", "Abdomen"], ["Ultrasound upper abdomen", "Upper abdomen"],
    ["Ultrasound abdomen and pelvis", "Abdomen and pelvis"], ["Ultrasound pelvis - transabdominal", "Pelvis"],
    ["Ultrasound pelvis - transvaginal", "Pelvis"], ["Ultrasound KUB", "Kidneys, ureters and bladder"],
    ["Ultrasound KUB with post-void residual", "Urinary tract"], ["Ultrasound kidney", "Kidneys"],
    ["Ultrasound urinary bladder", "Urinary bladder"], ["Ultrasound prostate", "Prostate"],
    ["Ultrasound scrotum", "Scrotum"], ["Ultrasound penis", "Penis"], ["Ultrasound thyroid", "Thyroid"],
    ["Ultrasound neck", "Neck"], ["Ultrasound breast - unilateral", "Breast"], ["Ultrasound breasts - bilateral", "Breasts"],
    ["Ultrasound axilla", "Axilla"], ["Ultrasound soft tissue", "Soft tissue"], ["Ultrasound musculoskeletal", "Musculoskeletal region"],
    ["Ultrasound shoulder", "Shoulder"], ["Ultrasound elbow", "Elbow"], ["Ultrasound wrist and hand", "Wrist and hand"],
    ["Ultrasound hip", "Hip"], ["Ultrasound knee", "Knee"], ["Ultrasound ankle and foot", "Ankle and foot"],
    ["Ultrasound neonatal brain", "Brain"], ["Ultrasound neonatal spine", "Spine"], ["Ultrasound infant hips", "Hips"],
    ["Ultrasound obstetric - early pregnancy", "Uterus and pregnancy"], ["Ultrasound obstetric - dating and viability", "Pregnancy"],
    ["Ultrasound obstetric - nuchal translucency", "Pregnancy"], ["Ultrasound obstetric - anomaly scan", "Foetus"],
    ["Ultrasound obstetric - growth scan", "Foetus"], ["Ultrasound obstetric - biophysical profile", "Foetus"],
    ["Ultrasound follicular monitoring", "Ovaries and uterus"], ["Saline infusion sonography", "Uterine cavity"],
    ["Carotid Doppler ultrasound", "Carotid arteries"], ["Venous Doppler - lower limb", "Lower-limb veins"],
    ["Arterial Doppler - lower limb", "Lower-limb arteries"], ["Venous Doppler - upper limb", "Upper-limb veins"],
    ["Arterial Doppler - upper limb", "Upper-limb arteries"], ["Renal artery Doppler", "Renal arteries"],
    ["Portal vein Doppler", "Portal venous system"], ["Obstetric Doppler", "Foetoplacental circulation"],
    ["Penile Doppler", "Penile vasculature"], ["Transcranial Doppler", "Cerebral arteries"],
    ["Ultrasound-guided aspiration", "Specified lesion"], ["Ultrasound-guided biopsy", "Specified lesion"],
  ],
  "CT": [
    ["CT brain without contrast", "Brain"], ["CT brain with contrast", "Brain"], ["CT brain with and without contrast", "Brain"],
    ["CT perfusion brain", "Brain"], ["CT angiography head", "Intracranial arteries"], ["CT angiography neck", "Neck arteries"],
    ["CT paranasal sinuses", "Paranasal sinuses"], ["CT orbit", "Orbits"], ["CT temporal bones", "Temporal bones"],
    ["CT facial bones", "Facial bones"], ["CT neck with contrast", "Neck"], ["CT chest without contrast", "Chest"],
    ["CT chest with contrast", "Chest"], ["HRCT chest", "Lungs"], ["Low-dose CT chest screening", "Lungs"],
    ["CT pulmonary angiography", "Pulmonary arteries"], ["CT coronary angiography", "Coronary arteries"],
    ["CT aortogram", "Aorta"], ["CT abdomen without contrast", "Abdomen"], ["CT abdomen with contrast", "Abdomen"],
    ["CT abdomen and pelvis with contrast", "Abdomen and pelvis"], ["CT triple-phase liver", "Liver"],
    ["CT pancreas protocol", "Pancreas"], ["CT enterography", "Small bowel"], ["CT colonography", "Colon"],
    ["CT KUB - stone protocol", "Urinary tract"], ["CT urography", "Urinary tract"], ["CT renal angiography", "Renal arteries"],
    ["CT mesenteric angiography", "Mesenteric vessels"], ["CT peripheral angiography", "Peripheral arteries"],
    ["CT cervical spine", "Cervical spine"], ["CT thoracic spine", "Thoracic spine"], ["CT lumbar spine", "Lumbar spine"],
    ["CT shoulder", "Shoulder"], ["CT elbow", "Elbow"], ["CT wrist", "Wrist"], ["CT hip", "Hip"],
    ["CT knee", "Knee"], ["CT ankle", "Ankle"], ["CT-guided biopsy", "Specified lesion"],
    ["CT-guided drainage", "Specified collection"], ["CT whole-body trauma", "Whole body"],
  ],
  "MRI": [
    ["MRI brain without contrast", "Brain"], ["MRI brain with contrast", "Brain"], ["MRI brain with and without contrast", "Brain"],
    ["MRI epilepsy protocol", "Brain"], ["MRI stroke protocol", "Brain"], ["MRI pituitary protocol", "Pituitary gland"],
    ["MRI internal auditory canals", "Internal auditory canals"], ["MRI orbit", "Orbits"], ["MRI face and neck", "Face and neck"],
    ["MR angiography brain", "Intracranial arteries"], ["MR venography brain", "Cerebral veins"],
    ["MRI cervical spine", "Cervical spine"], ["MRI thoracic spine", "Thoracic spine"], ["MRI lumbar spine", "Lumbar spine"],
    ["MRI whole spine screening", "Whole spine"], ["MRI brachial plexus", "Brachial plexus"],
    ["MRI shoulder", "Shoulder"], ["MRI elbow", "Elbow"], ["MRI wrist", "Wrist"], ["MRI hand", "Hand"],
    ["MRI hip", "Hip"], ["MRI knee", "Knee"], ["MRI ankle", "Ankle"], ["MRI foot", "Foot"],
    ["MRI temporomandibular joints", "TM joints"], ["MRI chest", "Chest"], ["MRI cardiac morphology and function", "Heart"],
    ["Cardiac MRI viability study", "Heart"], ["MR angiography aorta", "Aorta"], ["MRI abdomen", "Abdomen"],
    ["MRI liver", "Liver"], ["MRCP", "Biliary and pancreatic ducts"], ["MRI pancreas", "Pancreas"],
    ["MRI kidneys", "Kidneys"], ["MR enterography", "Small bowel"], ["MRI pelvis", "Pelvis"],
    ["MRI prostate multiparametric", "Prostate"], ["MRI rectum", "Rectum"], ["MRI fistulogram", "Perianal region"],
    ["MRI female pelvis", "Female pelvis"], ["MRI breast - bilateral", "Breasts"], ["MRI foetal", "Foetus"],
    ["Whole-body MRI", "Whole body"], ["MR spectroscopy", "Specified tissue"], ["Functional MRI brain", "Brain"],
  ],
  "Mammography": [
    ["Screening mammography - bilateral", "Breasts"], ["Diagnostic mammography - unilateral", "Breast"],
    ["Diagnostic mammography - bilateral", "Breasts"], ["Digital breast tomosynthesis", "Breasts"],
    ["Magnification mammography views", "Breast"], ["Spot compression mammography views", "Breast"],
    ["Stereotactic breast biopsy", "Breast"], ["Mammography-guided wire localisation", "Breast"],
  ],
  "DEXA": [
    ["DEXA bone density - lumbar spine and hip", "Lumbar spine and hip"], ["DEXA bone density - whole body", "Whole body"],
    ["DEXA bone density - forearm", "Forearm"], ["DEXA body composition", "Whole body"],
    ["Vertebral fracture assessment by DEXA", "Thoracolumbar spine"],
  ],
  "Fluoroscopy": [
    ["Barium swallow", "Oesophagus"], ["Barium meal", "Stomach and duodenum"], ["Barium follow-through", "Small bowel"],
    ["Barium enema", "Colon"], ["Upper GI contrast study", "Upper gastrointestinal tract"],
    ["Hysterosalpingography (HSG)", "Uterus and fallopian tubes"], ["Micturating cystourethrogram (MCUG)", "Bladder and urethra"],
    ["Retrograde urethrogram (RGU)", "Urethra"], ["Intravenous urography (IVU)", "Urinary tract"],
    ["Sinogram", "Sinus tract"], ["Fistulogram", "Fistula"], ["Arthrogram", "Specified joint"],
    ["Fluoroscopic lumbar puncture", "Lumbar spine"],
  ],
  "Nuclear Medicine": [
    ["Thyroid uptake scan", "Thyroid"], ["Whole-body iodine scan", "Whole body"], ["Bone scan - whole body", "Skeleton"],
    ["Three-phase bone scan", "Specified bone region"], ["Renal scan - DTPA", "Kidneys"], ["Renal scan - DMSA", "Kidneys"],
    ["Renogram - EC", "Kidneys"], ["Hepatobiliary scan (HIDA)", "Liver and gallbladder"],
    ["Myocardial perfusion scan", "Heart"], ["MUGA scan", "Heart"], ["Lung ventilation-perfusion scan", "Lungs"],
    ["Parathyroid sestamibi scan", "Parathyroid glands"], ["Gastric emptying study", "Stomach"],
    ["GI bleeding scan", "Gastrointestinal tract"], ["Meckel's scan", "Small bowel"], ["Sentinel lymph-node mapping", "Lymphatic drainage"],
    ["Octreotide receptor scan", "Whole body"], ["I-131 MIBG scan", "Whole body"], ["DaTscan", "Brain"],
  ],
  "PET-CT": [
    ["FDG PET-CT whole body", "Whole body"], ["FDG PET-CT brain", "Brain"], ["FDG PET-CT cardiac viability", "Heart"],
    ["PSMA PET-CT", "Whole body"], ["DOTANOC PET-CT", "Whole body"], ["DOTATATE PET-CT", "Whole body"],
    ["FAPI PET-CT", "Whole body"], ["Amyloid PET-CT brain", "Brain"], ["Choline PET-CT", "Whole body"],
    ["PET-CT treatment-response assessment", "Whole body"],
  ],
  "Echocardiography": [
    ["2D echocardiography with Doppler", "Heart"], ["Transthoracic echocardiography", "Heart"],
    ["Transoesophageal echocardiography", "Heart"], ["Stress echocardiography", "Heart"],
    ["Dobutamine stress echocardiography", "Heart"], ["Foetal echocardiography", "Foetal heart"],
    ["Paediatric echocardiography", "Heart"], ["Contrast echocardiography", "Heart"],
    ["3D echocardiography", "Heart"], ["Speckle-tracking strain echocardiography", "Heart"],
  ],
  "Dental Imaging": [
    ["Intraoral periapical radiograph (IOPA)", "Teeth"], ["Bitewing dental radiograph", "Teeth"],
    ["Occlusal dental radiograph", "Teeth and jaw"], ["Orthopantomogram (OPG)", "Jaws and teeth"],
    ["Lateral cephalogram", "Skull and jaw"], ["PA cephalogram", "Skull and jaw"],
    ["Cone-beam CT dental", "Jaws and teeth"], ["TM joint cone-beam CT", "TM joints"],
  ],
  "Interventional Radiology": [
    ["Image-guided fine-needle aspiration", "Specified lesion"], ["Image-guided core biopsy", "Specified lesion"],
    ["Image-guided abscess drainage", "Specified collection"], ["Percutaneous nephrostomy", "Kidney"],
    ["Percutaneous transhepatic biliary drainage", "Biliary tract"], ["Angiography - diagnostic", "Specified vessels"],
    ["Peripheral angioplasty", "Peripheral arteries"], ["Uterine artery embolisation", "Uterine arteries"],
    ["Transarterial chemoembolisation", "Hepatic tumour vasculature"], ["Radiofrequency ablation", "Specified lesion"],
    ["Microwave ablation", "Specified lesion"], ["IVC filter placement", "Inferior vena cava"],
    ["PICC line placement", "Upper-limb vein"], ["Central venous catheter placement", "Central vein"],
  ],
};

const aliases: Record<string, string[]> = {
  "Chest X-ray, 2 views": ["CXR 2V", "chest PA and lateral", "X-ray chest 2V"],
  "Chest X-ray, PA view": ["CXR PA", "X-ray chest PA"],
  "KUB X-ray": ["X-ray KUB"], "Ultrasound abdomen complete": ["USG abdomen"],
  "Ultrasound abdomen and pelvis": ["USG A/P", "USG abdomen pelvis"],
  "Ultrasound pelvis - transvaginal": ["TVS", "transvaginal sonography"],
  "Ultrasound obstetric - anomaly scan": ["TIFFA", "level 2 scan"],
  "CT brain without contrast": ["NCCT brain", "plain CT brain"], "HRCT chest": ["high resolution CT chest"],
  "CT KUB - stone protocol": ["NCCT KUB", "CT renal stone"], "CT coronary angiography": ["CTCA"],
  "MRI brain without contrast": ["plain MRI brain"], "MRCP": ["magnetic resonance cholangiopancreatography"],
  "MRI prostate multiparametric": ["mpMRI prostate"], "Screening mammography - bilateral": ["mammogram"],
  "DEXA bone density - lumbar spine and hip": ["BMD", "bone mineral density"],
  "2D echocardiography with Doppler": ["2D echo", "echo Doppler"], "Orthopantomogram (OPG)": ["OPG dental"],
  "FDG PET-CT whole body": ["PET scan whole body"], "Hysterosalpingography (HSG)": ["HSG"],
};

const modalityPrefixes: Record<string, string> = {
  "X-Ray": "XR", Ultrasound: "US", CT: "CT", MRI: "MR", Mammography: "MG", DEXA: "DX",
  Fluoroscopy: "FL", "Nuclear Medicine": "NM", "PET-CT": "PT", Echocardiography: "EC",
  "Dental Imaging": "DN", "Interventional Radiology": "IR",
};

function generatedCode(modality: string, name: string, index: number) {
  if (name === "Chest X-ray, 2 views") return "XR-CHEST-2V";
  const token = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
  return `${modalityPrefixes[modality]}-${String(index + 1).padStart(3, "0")}-${token}`;
}

function descriptionFor(modality: string, name: string, bodyPart: string) {
  return `${name} — ${modality} examination of ${bodyPart.toLocaleLowerCase()} for diagnostic assessment.`;
}

export const imagingCatalog: ImagingCatalogItem[] = Object.entries(groups).flatMap(([modality, procedures]) =>
  procedures.map(([name, bodyPart], index) => ({
    code: generatedCode(modality, name, index), name, modality, bodyPart,
    description: descriptionFor(modality, name, bodyPart), aliases: aliases[name] || [],
  })),
);

export function searchImagingCatalog(query: string, limit = 20, catalog = imagingCatalog) {
  const normalized = query.toLocaleLowerCase().trim();
  const terms = normalized.split(/\s+/).filter(Boolean);
  if (!terms.length) return catalog.slice(0, limit);
  return catalog
    .map((item) => {
      const name = item.name.toLocaleLowerCase();
      const aliasText = item.aliases.join(" ").toLocaleLowerCase();
      const haystack = `${name} ${item.modality} ${item.bodyPart} ${item.description} ${aliasText}`.toLocaleLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return null;
      const score = name === normalized ? 0 : item.aliases.some((alias) => alias.toLocaleLowerCase() === normalized) ? 1 : name.startsWith(terms[0]) ? 2 : 3;
      return { item, score };
    })
    .filter((result): result is { item: ImagingCatalogItem; score: number } => result !== null)
    .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((result) => result.item);
}

/**
 * SEED CONTENT
 * Everything the public site renders comes from this object.
 * It is copied into the Zustand store on first load and then persisted to
 * localStorage, so anything you change in Admin → Content survives a refresh.
 *
 * ⚠️  Placeholder notice: KSO's legal name, registration numbers, address and
 *     phone are filled with clearly-marked samples. Replace them in
 *     Admin → Content → Organisation (or here) before going live.
 */

export const defaultContent = {
  org: {
    shortName: 'KSOCHD',
    fullName: "Kuki Students' Organisation Chandigarh",
    tagline: 'Learn • Unite • Serve',
    city: 'Chandigarh',
    area: 'Chandigarh · Mohali · Panchkula',
    foundedYear: '— confirm founding year —',
    registration: 'Regd. No. 2991/79',
    taxExemption: '80G exempt — (add your 80G registration no.)',
    fcra: 'FCRA — (add if registered, or delete this line)',
    address: 'Sector 00, Chandigarh — 1600XX, India',
    phone: '+91 00000 00000',
    email: 'hello@ksochandigarh.org',
    hours: 'Mon – Sat · 9:30 am to 6:00 pm',
    social: {
      facebook: 'https://facebook.com/',
      instagram: 'https://instagram.com/',
      twitter: 'https://twitter.com/',
      youtube: 'https://youtube.com/',
      linkedin: 'https://linkedin.com/',
    },
    upiId: 'kso@upi',
    bankName: '— add bank name —',
    bankAccount: '— add account no. —',
    bankIfsc: '— add IFSC —',
  },

  hero: {
    eyebrow: 'Chandigarh Tricity · Since 2009',
    title: 'Dignity, delivered daily — right here in the Tricity.',
    subtitle:
      'KSO is a volunteer-led non-profit working across education, health, livelihoods and relief in Chandigarh, Mohali and Panchkula. Every rupee stays local, and every rupee is accounted for.',
    primaryCta: { label: 'Donate now', href: '/donate' },
    secondaryCta: { label: 'Become a volunteer', href: '/volunteer' },
    image:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=70',
  },

  stats: [
    { id: 's1', label: 'Lives reached', value: 12480, suffix: '+', icon: 'Users' },
    { id: 's2', label: 'Children in school', value: 1850, suffix: '+', icon: 'GraduationCap' },
    { id: 's3', label: 'Health camps held', value: 214, suffix: '', icon: 'Stethoscope' },
    { id: 's4', label: 'Active volunteers', value: 640, suffix: '+', icon: 'HeartHandshake' },
  ],

  about: {
    heading: 'We are neighbours helping neighbours.',
    body: [
      'KSO began in 2009 with eleven volunteers and one clear belief: the distance between someone who needs help and someone who can give it is usually just a few kilometres — and a little organisation.',
      'Today we run year-round programmes across the Tricity, from remedial classes in colony parks to free diagnostic camps and skill training for women restarting their careers. We work with panchayats, Resident Welfare Associations, government schools and corporates who want their CSR to actually land.',
      'We publish where every rupee goes, we keep our overheads under 12%, and we do not hand out help in ways that create dependence. Our job is to build capacity, then step back.',
    ],
    image:
      'https://images.unsplash.com/photo-1593113566592-e2d3b1a1a2b0?auto=format&fit=crop&w=1200&q=70',
    values: [
      {
        id: 'v1',
        icon: 'ShieldCheck',
        title: 'Transparency',
        text: 'Audited books, published annually. Every donation is traceable to a programme.',
      },
      {
        id: 'v2',
        icon: 'Scale',
        title: 'Dignity first',
        text: 'We design programmes with the community, not for it. No photos without consent.',
      },
      {
        id: 'v3',
        icon: 'Sprout',
        title: 'Lasting impact',
        text: 'We measure outcomes, not activity. If it does not change a life, we stop doing it.',
      },
      {
        id: 'v4',
        icon: 'Users',
        title: 'Local leadership',
        text: 'Volunteers from the neighbourhood lead the work in that neighbourhood.',
      },
    ],
    milestones: [
      { id: 'm1', year: '2009', text: 'Founded by 11 volunteers with one remedial class in Sector 00.' },
      { id: 'm2', year: '2013', text: 'First free multi-speciality health camp; 400 patients in one day.' },
      { id: 'm3', year: '2017', text: 'Livelihood programme launched; 300 women trained in its first year.' },
      { id: 'm4', year: '2021', text: 'COVID relief: ration and oxygen support to 2,000+ families.' },
      { id: 'm5', year: '2024', text: 'Adopted 6 government schools for year-round academic support.' },
    ],
  },

  programs: [
    {
      id: 'p1',
      slug: 'education',
      icon: 'GraduationCap',
      title: 'Shiksha — Education Support',
      summary:
        'Remedial classes, school supplies and mentoring for first-generation learners in government schools and colony centres.',
      body: 'Our education programme runs daily two-hour classes for children in Classes 3 to 10 who have fallen behind, plus a mentoring track for Class 11–12 students preparing for board exams. Every centre is within walking distance of the homes it serves, and every teacher is a trained volunteer or a paid local tutor.\n\nWe also cover the unglamorous essentials that decide whether a child stays in school: uniforms, shoes, stationery, exam fees and, where needed, a bicycle to reach a secondary school.',
      image:
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=70',
      metrics: [
        { label: 'Children enrolled', value: '1,850' },
        { label: 'Learning centres', value: '14' },
        { label: 'Board pass rate', value: '94%' },
      ],
      costPerUnit: 1200,
      unitLabel: 'sponsors one child for a year',
    },
    {
      id: 'p2',
      slug: 'health',
      icon: 'Stethoscope',
      title: 'Arogya — Health & Nutrition',
      summary:
        'Free diagnostic camps, medicine support and maternal nutrition for families who delay care because of cost.',
      body: 'Arogya runs monthly multi-speciality camps (general medicine, eye, dental, gynaecology, paediatrics) and referral support for anything that needs a hospital. We stock a small pharmacy of essential medicines and run a nutrition supplement drive for pregnant women and children under five.\n\nWe deliberately work through the government system — camp findings are handed to the local dispensary so follow-up continues after we pack up.',
      image:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=70',
      metrics: [
        { label: 'Patients screened', value: '31,400' },
        { label: 'Camps held', value: '214' },
        { label: 'Referrals completed', value: '2,180' },
      ],
      costPerUnit: 350,
      unitLabel: 'covers one patient’s screening and medicines',
    },
    {
      id: 'p3',
      slug: 'livelihood',
      icon: 'Briefcase',
      title: 'Rozgar — Livelihoods & Skills',
      summary:
        'Skill training, placement support and micro-grants for women and young people restarting or starting work.',
      body: 'Rozgar trains in tailoring, basic accounting, digital literacy, spoken English and beauty services — chosen each year from what local employers say they will actually hire for. Graduates get placement support and a six-month follow-up.\n\nA small revolving micro-grant fund (₹8,000–₹25,000) helps graduates buy the sewing machine, the cart, or the kit that turns training into income.',
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=70',
      metrics: [
        { label: 'Trained', value: '960' },
        { label: 'Placed in work', value: '612' },
        { label: 'Micro-grants given', value: '148' },
      ],
      costPerUnit: 4500,
      unitLabel: 'trains and places one person',
    },
    {
      id: 'p4',
      slug: 'community',
      icon: 'HeartHandshake',
      title: 'Sahara — Relief & Community',
      summary:
        'Rapid relief during floods, fires and winters, plus year-round support for elderly neighbours living alone.',
      body: 'Sahara is our emergency arm: winter blanket and ration drives, flood and fire relief, and a rapid-response volunteer network that can mobilise within hours.\n\nYear-round, our volunteers make weekly visits to elderly residents who live alone — company, medicine pick-ups, and an escort to the dispensary. It costs almost nothing and it is the work our volunteers say matters most.',
      image:
        'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1400&q=70',
      metrics: [
        { label: 'Families supported', value: '4,200' },
        { label: 'Winter kits distributed', value: '7,800' },
        { label: 'Elderly on weekly visit list', value: '190' },
      ],
      costPerUnit: 850,
      unitLabel: 'feeds a family of four for a month',
    },
  ],

  impact: {
    heading: 'Where the money actually goes',
    note: 'Figures below are illustrative for this demo build — replace with your audited numbers in Admin → Content → Impact.',
    allocation: [
      { id: 'a1', label: 'Programmes & beneficiaries', value: 78, color: 'var(--brand-600)' },
      { id: 'a2', label: 'Field staff & volunteers', value: 10, color: 'var(--brand-400)' },
      { id: 'a3', label: 'Administration', value: 7, color: 'var(--accent-400)' },
      { id: 'a4', label: 'Fundraising', value: 5, color: 'rgb(148 163 184)' },
    ],
    yearly: [
      { id: 'y1', year: '2021', raised: 1840000, people: 5200 },
      { id: 'y2', year: '2022', raised: 2760000, people: 7400 },
      { id: 'y3', year: '2023', raised: 3980000, people: 9800 },
      { id: 'y4', year: '2024', raised: 5240000, people: 12480 },
    ],
    reports: [
      { id: 'r1', title: 'Annual Report 2024', type: 'PDF', size: '4.2 MB', href: '#' },
      { id: 'r2', title: 'Audited Financials 2023–24', type: 'PDF', size: '1.8 MB', href: '#' },
      { id: 'r3', title: 'Impact Review 2023', type: 'PDF', size: '3.1 MB', href: '#' },
    ],
  },

  events: [
    {
      id: 'e1',
      title: 'Tricity Marathon for Education',
      date: '2026-10-04',
      time: '6:00 am',
      location: 'Sukhna Lake, Chandigarh',
      category: 'Fundraiser',
      image:
        'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=70',
      excerpt: '5K, 10K and a 2K family walk. Every entry fee funds a child’s school year.',
      body: 'Our biggest fundraiser of the year. Register as a runner, a volunteer, or a sponsor — last year 2,400 runners funded 260 school sponsorships.',
      seats: 2400,
      registrationOpen: true,
    },
    {
      id: 'e2',
      title: 'Free Multi-Speciality Health Camp',
      date: '2026-09-27',
      time: '8:00 am – 2:00 pm',
      location: 'Community Centre, Sector 38 West, Chandigarh',
      category: 'Health',
      image:
        'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=70',
      excerpt: 'General medicine, eye, dental and paediatrics. Free consultations and medicines.',
      body: 'Bring any existing prescriptions and reports. Registration opens at 8 am; please carry an ID. Follow-up referrals are handed to the local dispensary.',
      seats: 400,
      registrationOpen: true,
    },
    {
      id: 'e3',
      title: 'Winter Warmth Drive — Kit Packing',
      date: '2026-11-15',
      time: '10:00 am – 4:00 pm',
      location: 'KSO Office, Chandigarh',
      category: 'Volunteer',
      image:
        'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70',
      excerpt: 'Help us pack 3,000 winter kits for construction workers and street-connected families.',
      body: 'No experience needed — just two hours of your time. We provide lunch, and children over 10 are welcome with a guardian.',
      seats: 300,
      registrationOpen: true,
    },
  ],

  stories: [
    {
      id: 'st1',
      slug: 'meera-class-10',
      title: 'Meera is the first in her family to finish Class 10',
      date: '2026-07-18',
      author: 'KSO Education Team',
      category: 'Education',
      image:
        'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1400&q=70',
      excerpt:
        'Two years ago she was working in a tailor’s shop. Now she wants to be a teacher — and she is tutoring four younger girls on the way there.',
      body: 'Meera joined our Sector 00 evening centre in 2024, two years after dropping out to support her family. Her mentor, a college student volunteer, worked with her three evenings a week on maths and English.\n\nShe scored 78% in her Class 10 boards this year and has enrolled in Class 11 with the humanities stream. She now tutors four girls from her own colony every Sunday — the part of this story she is proudest of.\n\n“I used to think school was for other people,” she says. “Now I know I was just a few classes behind.”',
      featured: true,
    },
    {
      id: 'st2',
      slug: 'camp-that-found-300',
      title: 'One Sunday camp found 300 people who had never had an eye test',
      date: '2026-05-02',
      author: 'Arogya Team',
      category: 'Health',
      image:
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=70',
      excerpt:
        'Most had been managing with headaches and blurred vision for years. 118 walked away with free glasses the same afternoon.',
      body: 'At our April camp in Panchkula, 300 of the 412 people screened had never had a vision test. Cataract was detected in 34; 118 received free spectacles the same afternoon.\n\nWe now keep a vision-testing station at every camp, because this is the cheapest, highest-impact thing we do: twenty minutes per person, and someone can read again.',
      featured: true,
    },
    {
      id: 'st3',
      slug: 'rozgar-graduates',
      title: 'What 42 Rozgar graduates did in their first year',
      date: '2026-03-11',
      author: 'Rozgar Team',
      category: 'Livelihood',
      image:
        'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=1400&q=70',
      excerpt: 'Average monthly household income went from ₹6,400 to ₹14,900. Here is the breakdown.',
      body: 'We followed 42 women who completed our 2025 tailoring and digital literacy cohort. Thirty-one are earning from tailoring or a small business, six took salaried jobs, and five are in further training.\n\nAverage monthly household income in the group rose from ₹6,400 to ₹14,900. Eleven of them have already referred a neighbour to the next cohort — which is how most of our enrolment works now.',
      featured: false,
    },
  ],

  gallery: {
    heading: 'From the field',
    images: [
      { id: 'g1', src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=70', caption: 'Evening class, Sector 00 centre', tag: 'Education' },
      { id: 'g2', src: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=70', caption: 'Eye testing at a Sunday camp', tag: 'Health' },
      { id: 'g3', src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=70', caption: 'Rozgar stitching batch', tag: 'Livelihood' },
      { id: 'g4', src: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=900&q=70', caption: 'Winter kit distribution', tag: 'Relief' },
      { id: 'g5', src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=70', caption: 'Library corner, afternoon shift', tag: 'Education' },
      { id: 'g6', src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=70', caption: 'Volunteer packing evening', tag: 'Volunteers' },
      { id: 'g7', src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=70', caption: 'Nutrition check-up', tag: 'Health' },
      { id: 'g8', src: 'https://images.unsplash.com/photo-1593113566592-e2d3b1a1a2b0?auto=format&fit=crop&w=900&q=70', caption: 'Tricity Marathon, last year', tag: 'Fundraiser' },
    ],
  },

  team: [
    { id: 't1', name: '— Name —', role: 'President', image: '', bio: 'Add a short bio (2 lines).' },
    { id: 't2', name: '— Name —', role: 'General Secretary', image: '', bio: 'Add a short bio (2 lines).' },
    { id: 't3', name: '— Name —', role: 'Treasurer', image: '', bio: 'Add a short bio (2 lines).' },
    { id: 't4', name: '— Name —', role: 'Programme Head, Education', image: '', bio: 'Add a short bio (2 lines).' },
  ],

  testimonials: [
    {
      id: 'q1',
      quote:
        'I have donated to a lot of organisations. KSO is the only one that sends me the actual breakdown of where my money went, without me asking.',
      author: '— Donor name —',
      role: 'Monthly donor since 2021',
    },
    {
      id: 'q2',
      quote:
        'I signed up for a Saturday morning. Three years later I run a learning centre. This place changes the volunteer as much as anyone else.',
      author: '— Volunteer name —',
      role: 'Volunteer, Sector 00 centre',
    },
    {
      id: 'q3',
      quote:
        'Our CSR partner review rated KSO highest on reporting quality out of eleven NGOs we work with across North India.',
      author: '— Partner name —',
      role: 'CSR lead, corporate partner',
    },
  ],

  faqs: [
    {
      id: 'f1',
      q: 'Is my donation tax deductible?',
      a: 'Yes. KSO is registered under 80G, so Indian donors can deduct contributions from taxable income. You will receive your receipt by email within 48 hours of the donation. Add your 80G registration number in Admin → Content → Organisation.',
    },
    {
      id: 'f2',
      q: 'How do I know where my money goes?',
      a: 'Every donation is tagged to a programme, our audited financials are published on the Impact page, and donors who give monthly receive a quarterly note showing what their contribution funded.',
    },
    {
      id: 'f3',
      q: 'Can I volunteer if I have a full-time job?',
      a: 'Yes — most of our volunteers do. Learning centres run on weekday evenings and Saturday mornings, and we have remote roles in writing, design, translation and mentoring.',
    },
    {
      id: 'f4',
      q: 'Do you accept corporate CSR funding?',
      a: 'We do. We are CSR-1 registered and can issue the documentation your compliance team needs. Write to us and we will share our project proposals and past utilisation certificates.',
    },
    {
      id: 'f5',
      q: 'What if I want to donate goods instead of money?',
      a: 'Books, stationery, warm clothing, non-perishable food and unused medicines are all useful. Please message us first so we can tell you what is needed that month — unsorted clothing is the one thing we cannot use.',
    },
    {
      id: 'f6',
      q: 'Which areas do you work in?',
      a: 'Chandigarh, Mohali and Panchkula — the Tricity. We keep our footprint small on purpose so our volunteers can walk to the communities they serve.',
    },
  ],

  donationPresets: [500, 1000, 2500, 5000, 10000],
  donationCopy: {
    heading: 'Give once, or give monthly. Both matter.',
    sub: 'Monthly giving is what lets us plan — it puts teachers in centres and medicines on shelves before we need them.',
  },

  // Extra facts the AI assistant may use (edited in Admin → Site content → SEO)
  ai: { extraKnowledge: '' },

  seo: {
    titleSuffix: 'KSO Chandigarh',
    metaDescription:
      "Kuki Students' Organisation Chandigarh (KSO) — education, health, livelihood and relief work across the Chandigarh Tricity. Donate or volunteer.",
  },
}

export default defaultContent

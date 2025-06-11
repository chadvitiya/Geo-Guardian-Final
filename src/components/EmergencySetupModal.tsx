import React, { useState } from 'react';
import { X, Plus, Trash2, Heart, Phone, User, AlertTriangle, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

interface MedicalInfo {
  bloodType?: string;
  allergies: string[];
  medications: string[];
  medicalConditions: string[];
  emergencyNotes: string;
  doctorName?: string;
  doctorPhone?: string;
  insuranceInfo?: string;
}

interface EmergencySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmergencySetupModal: React.FC<EmergencySetupModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateEmergencyInfo } = useAuth();
  const [activeTab, setActiveTab] = useState<'contacts' | 'medical'>('contacts');
  const [saving, setSaving] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
    userProfile?.emergencyContacts || []
  );

  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>(
    userProfile?.medicalInfo || {
      allergies: [],
      medications: [],
      medicalConditions: [],
      emergencyNotes: '',
    }
  );

  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newCondition, setNewCondition] = useState('');

  if (!isOpen) return null;

  const addEmergencyContact = () => {
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: '',
      phone: '',
      relationship: '',
      isPrimary: emergencyContacts.length === 0,
    };
    setEmergencyContacts([...emergencyContacts, newContact]);
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string | boolean) => {
    setEmergencyContacts(contacts =>
      contacts.map(contact =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const removeContact = (id: string) => {
    setEmergencyContacts(contacts => contacts.filter(contact => contact.id !== id));
  };

  const setPrimaryContact = (id: string) => {
    setEmergencyContacts(contacts =>
      contacts.map(contact => ({
        ...contact,
        isPrimary: contact.id === id
      }))
    );
  };

  const addToArray = (array: string[], value: string, setter: (arr: string[]) => void) => {
    if (value.trim() && !array.includes(value.trim())) {
      setter([...array, value.trim()]);
    }
  };

  const removeFromArray = (array: string[], value: string, setter: (arr: string[]) => void) => {
    setter(array.filter(item => item !== value));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmergencyInfo(emergencyContacts, medicalInfo);
      onClose();
    } catch (error) {
      console.error('Error saving emergency info:', error);
      alert('Failed to save emergency information');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={28} className="text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Emergency Information Setup</h2>
                <p className="text-red-100">Help us keep you safe in emergencies</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 transition-colors p-2 rounded-xl hover:bg-red-600/50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-700 border-b border-slate-600">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'contacts'
                ? 'bg-slate-800 text-white border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone size={20} />
            Emergency Contacts
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'medical'
                ? 'bg-slate-800 text-white border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart size={20} />
            Medical Information
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Emergency Contacts</h3>
                <button
                  onClick={addEmergencyContact}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Contact
                </button>
              </div>

              {emergencyContacts.length === 0 ? (
                <div className="text-center py-12">
                  <User size={48} className="text-slate-600 mx-auto mb-4" />
                  <h3 className="text-slate-400 text-lg mb-2">No emergency contacts yet</h3>
                  <p className="text-slate-500">Add contacts who should be notified in emergencies</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emergencyContacts.map((contact) => (
                    <div key={contact.id} className="bg-slate-700/50 border border-slate-600 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${contact.isPrimary ? 'bg-red-500' : 'bg-slate-500'}`} />
                          <span className="text-white font-semibold">
                            {contact.isPrimary ? 'Primary Contact' : 'Emergency Contact'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {!contact.isPrimary && (
                            <button
                              onClick={() => setPrimaryContact(contact.id)}
                              className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                            >
                              Set as Primary
                            </button>
                          )}
                          <button
                            onClick={() => removeContact(contact.id)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                            placeholder="Enter full name"
                            className="w-full px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">
                            Relationship
                          </label>
                          <select
                            value={contact.relationship}
                            onChange={(e) => updateContact(contact.id, 'relationship', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Select relationship</option>
                            <option value="spouse">Spouse</option>
                            <option value="parent">Parent</option>
                            <option value="child">Child</option>
                            <option value="sibling">Sibling</option>
                            <option value="friend">Friend</option>
                            <option value="colleague">Colleague</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Medical Information</h3>

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Blood Type
                  </label>
                  <select
                    value={medicalInfo.bloodType || ''}
                    onChange={(e) => setMedicalInfo({ ...medicalInfo, bloodType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select blood type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Insurance Information
                  </label>
                  <input
                    type="text"
                    value={medicalInfo.insuranceInfo || ''}
                    onChange={(e) => setMedicalInfo({ ...medicalInfo, insuranceInfo: e.target.value })}
                    placeholder="Insurance provider and policy number"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Doctor Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Primary Doctor
                  </label>
                  <input
                    type="text"
                    value={medicalInfo.doctorName || ''}
                    onChange={(e) => setMedicalInfo({ ...medicalInfo, doctorName: e.target.value })}
                    placeholder="Dr. Smith"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Doctor's Phone
                  </label>
                  <input
                    type="tel"
                    value={medicalInfo.doctorPhone || ''}
                    onChange={(e) => setMedicalInfo({ ...medicalInfo, doctorPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Allergies
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Add allergy"
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray(medicalInfo.allergies, newAllergy, (arr) => 
                          setMedicalInfo({ ...medicalInfo, allergies: arr })
                        );
                        setNewAllergy('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addToArray(medicalInfo.allergies, newAllergy, (arr) => 
                        setMedicalInfo({ ...medicalInfo, allergies: arr })
                      );
                      setNewAllergy('');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {medicalInfo.allergies.map((allergy) => (
                    <span
                      key={allergy}
                      className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {allergy}
                      <button
                        onClick={() => removeFromArray(medicalInfo.allergies, allergy, (arr) => 
                          setMedicalInfo({ ...medicalInfo, allergies: arr })
                        )}
                        className="hover:text-red-200"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Medications */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Current Medications
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="Add medication"
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray(medicalInfo.medications, newMedication, (arr) => 
                          setMedicalInfo({ ...medicalInfo, medications: arr })
                        );
                        setNewMedication('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addToArray(medicalInfo.medications, newMedication, (arr) => 
                        setMedicalInfo({ ...medicalInfo, medications: arr })
                      );
                      setNewMedication('');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {medicalInfo.medications.map((medication) => (
                    <span
                      key={medication}
                      className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {medication}
                      <button
                        onClick={() => removeFromArray(medicalInfo.medications, medication, (arr) => 
                          setMedicalInfo({ ...medicalInfo, medications: arr })
                        )}
                        className="hover:text-blue-200"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Medical Conditions */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Medical Conditions
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Add medical condition"
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToArray(medicalInfo.medicalConditions, newCondition, (arr) => 
                          setMedicalInfo({ ...medicalInfo, medicalConditions: arr })
                        );
                        setNewCondition('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addToArray(medicalInfo.medicalConditions, newCondition, (arr) => 
                        setMedicalInfo({ ...medicalInfo, medicalConditions: arr })
                      );
                      setNewCondition('');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {medicalInfo.medicalConditions.map((condition) => (
                    <span
                      key={condition}
                      className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {condition}
                      <button
                        onClick={() => removeFromArray(medicalInfo.medicalConditions, condition, (arr) => 
                          setMedicalInfo({ ...medicalInfo, medicalConditions: arr })
                        )}
                        className="hover:text-yellow-200"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Emergency Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Emergency Notes
                </label>
                <textarea
                  value={medicalInfo.emergencyNotes}
                  onChange={(e) => setMedicalInfo({ ...medicalInfo, emergencyNotes: e.target.value })}
                  placeholder="Any additional information that might be helpful in an emergency..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-700 p-6 flex justify-between">
          <button
            onClick={handleSkip}
            className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Save Emergency Info
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencySetupModal;
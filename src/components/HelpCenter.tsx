import { useState } from 'react';
import { X, Book, Users, Box, Calendar, FileText, Lightbulb, ExternalLink, ArrowLeft, ChevronRight } from 'lucide-react';

interface HelpCenterProps {
  onClose: () => void;
}

type Section = 'main' | 'getting-started' | 'collaboration' | 'props' | 'shows' | 'documentation' | 'tips';
type SubSection = 
  | 'create-show' | 'add-props' | 'organize-props' | 'manage-acts'
  | 'share-show' | 'assign-roles' | 'track-changes' | 'coordinate'
  | 'add-prop-details' | 'track-locations' | 'categories' | 'reports'
  | 'create-manage' | 'organize-acts' | 'track-requirements' | 'plan-transitions';

export function HelpCenter({ onClose }: HelpCenterProps) {
  const [activeSection, setActiveSection] = useState<Section>('main');
  const [activeSubSection, setActiveSubSection] = useState<SubSection | null>(null);
  const [history, setHistory] = useState<Section[]>(['main']);

  const navigateTo = (section: Section) => {
    setActiveSection(section);
    setHistory([...history, section]);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setActiveSection(newHistory[newHistory.length - 1]);
      setActiveSubSection(null);
    }
  };

  const renderSubSection = (title: string, content: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      {content}
    </div>
  );

  const renderMainContent = () => (
    <div className="p-6">
      {/* Getting Started */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Book className="h-5 w-5 text-[var(--highlight-color)]" />
          Getting Started
        </h3>
        <div className="space-y-4">
          <p>Welcome to Props Bible! Here's how to get started:</p>
          <div className="space-y-2">
            {[
              { id: 'create-show', text: 'Create your first show' },
              { id: 'add-props', text: 'Add props to your inventory' },
              { id: 'organize-props', text: 'Organize props by act and scene' },
              { id: 'manage-acts', text: 'Manage acts and scenes' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSubSection(item.id as SubSection)}
                className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between group"
              >
                <span>{item.text}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--highlight-color)]" />
          Collaboration
        </h3>
        <div className="space-y-4">
          <p>Work together with your team:</p>
          <div className="space-y-2">
            {[
              { id: 'share-show', text: 'Share shows with team members' },
              { id: 'assign-roles', text: 'Assign roles and permissions' },
              { id: 'track-changes', text: 'Track changes and updates' },
              { id: 'coordinate', text: 'Coordinate prop management' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSubSection(item.id as SubSection)}
                className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between group"
              >
                <span>{item.text}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Props Management */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Box className="h-5 w-5 text-[var(--highlight-color)]" />
          Props Management
        </h3>
        <div className="space-y-4">
          <p>Efficiently manage your props:</p>
          <div className="space-y-2">
            {[
              { id: 'add-prop-details', text: 'Add detailed prop information' },
              { id: 'track-locations', text: 'Track prop locations' },
              { id: 'categories', text: 'Organize props by categories' },
              { id: 'reports', text: 'Generate prop lists and reports' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSubSection(item.id as SubSection)}
                className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between group"
              >
                <span>{item.text}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Shows and Planning */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[var(--highlight-color)]" />
          Shows and Planning
        </h3>
        <div className="space-y-4">
          <p>Plan your productions:</p>
          <div className="space-y-2">
            {[
              { id: 'create-manage', text: 'Create and manage shows' },
              { id: 'organize-acts', text: 'Organize acts and scenes' },
              { id: 'track-requirements', text: 'Track prop requirements' },
              { id: 'plan-transitions', text: 'Plan prop transitions' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSubSection(item.id as SubSection)}
                className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between group"
              >
                <span>{item.text}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderSubSectionContent = () => {
    switch (activeSubSection) {
      case 'create-show':
        return renderSubSection('Creating Your First Show', (
          <div className="space-y-4">
            <p>Follow these steps to create your first show:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Navigate to Shows</h4>
                <p>Click on the "Shows" tab in the main navigation menu.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Create New Show</h4>
                <p>Click the "New Show" button in the top right corner.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Enter Show Details</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Enter the show name</li>
                  <li>Add a description</li>
                  <li>Set the number of acts</li>
                  <li>Add production details</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Add Acts and Scenes</h4>
                <p>Use the act manager to create and organize your show's structure.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">5. Save Your Show</h4>
                <p>Click "Save" to create your show and start adding props.</p>
              </li>
            </ol>
            <div className="mt-4 p-4 bg-[var(--highlight-color)]/10 rounded-lg">
              <p className="text-sm">
                <strong>Pro Tip:</strong> Use the Macbeth template to see a fully structured show example!
              </p>
            </div>
          </div>
        ));

      case 'add-props':
        return renderSubSection('Adding Props to Your Show', (
          <div className="space-y-4">
            <p>Follow these steps to add props to your show:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Select Your Show</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Go to the "Shows" tab</li>
                  <li>Click "Select for Props" on your desired show</li>
                  <li>The selected show will be marked as "Current Show"</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Navigate to Props</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Click on the "Props" tab in the main navigation</li>
                  <li>You'll see the prop form on the left side</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Fill in Prop Details</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Enter the prop name</li>
                  <li>Add a description</li>
                  <li>Select the category</li>
                  <li>Set the quantity needed</li>
                  <li>Add dimensions if applicable</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Assign to Acts and Scenes</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Select the act where the prop appears</li>
                  <li>Choose the specific scene(s)</li>
                  <li>Add any scene-specific notes</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">5. Add Images and Save</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Upload images of the prop (optional)</li>
                  <li>Click "Save" to add the prop to your inventory</li>
                </ul>
              </li>
            </ol>
            <div className="mt-4 p-4 bg-[var(--highlight-color)]/10 rounded-lg">
              <p className="text-sm">
                <strong>Pro Tip:</strong> You can use the bulk import feature to add multiple props at once using a spreadsheet!
              </p>
            </div>
          </div>
        ));

      case 'organize-props':
        return renderSubSection('Organizing Props by Act and Scene', (
          <div className="space-y-4">
            <p>Learn how to organize your props effectively:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Props List</h4>
                <p>Navigate to the Props tab to see your full inventory.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Use Filters</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Filter by act</li>
                  <li>Filter by scene</li>
                  <li>Filter by category</li>
                  <li>Use the search bar for specific props</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Bulk Edit Props</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Select multiple props</li>
                  <li>Change act/scene assignments</li>
                  <li>Update categories</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. View by Scene</h4>
                <p>Use the scene view to see all props needed for each scene.</p>
              </li>
            </ol>
          </div>
        ));

      case 'manage-acts':
        return renderSubSection('Managing Acts and Scenes', (
          <div className="space-y-4">
            <p>Learn how to manage your show's structure:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Edit Show Structure</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Go to the Shows tab</li>
                  <li>Click the edit button on your show</li>
                  <li>Scroll to the "Acts and Scenes" section</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Add/Edit Acts</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Click "Add Act" to create a new act</li>
                  <li>Enter act name and details</li>
                  <li>Reorder acts using drag and drop</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Manage Scenes</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Add scenes to each act</li>
                  <li>Name and number scenes</li>
                  <li>Add scene descriptions</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Save Changes</h4>
                <p>Click "Save" to update your show's structure.</p>
              </li>
            </ol>
            <div className="mt-4 p-4 bg-[var(--highlight-color)]/10 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> Changes to acts and scenes will update prop assignments automatically.
              </p>
            </div>
          </div>
        ));

      case 'track-locations':
        return renderSubSection('Tracking Prop Locations', (
          <div className="space-y-4">
            <p>Keep track of where your props are:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Set Storage Location</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Open a prop's details</li>
                  <li>Add storage location information</li>
                  <li>Include any specific storage requirements</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Track Movement</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Update prop status when moved</li>
                  <li>Log when props are checked out</li>
                  <li>Record return dates</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Use Location Tags</h4>
                <p>Add tags to quickly identify prop locations:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Storage</li>
                  <li>On Stage</li>
                  <li>In Transit</li>
                  <li>With Actor</li>
                </ul>
              </li>
            </ol>
          </div>
        ));

      case 'categories':
        return renderSubSection('Organizing Props by Categories', (
          <div className="space-y-4">
            <p>Learn how to use categories effectively:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Using Categories</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Select from preset categories</li>
                  <li>Create custom categories</li>
                  <li>Use subcategories for detail</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Bulk Categorization</h4>
                <p>Categorize multiple props at once:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Select multiple props</li>
                  <li>Apply category changes</li>
                  <li>Use batch editing</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Category Reports</h4>
                <p>Generate reports filtered by categories to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Track inventory by type</li>
                  <li>Plan purchases</li>
                  <li>Organize storage</li>
                </ul>
              </li>
            </ol>
          </div>
        ));

      case 'share-show':
        return renderSubSection('Sharing Shows with Team Members', (
          <div className="space-y-4">
            <p>Follow these steps to collaborate with your team:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Open Share Settings</h4>
                <p>Click the "Share" button on your show's page.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Add Collaborators</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Enter team member's email</li>
                  <li>Select their role (Editor/Viewer)</li>
                  <li>Click "Add"</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Manage Permissions</h4>
                <p>Set what collaborators can view and edit.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Send Invitations</h4>
                <p>Team members will receive email invitations to join.</p>
              </li>
            </ol>
            <div className="mt-4 p-4 bg-[var(--highlight-color)]/10 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> You can modify or revoke access at any time.
              </p>
            </div>
          </div>
        ));

      case 'assign-roles':
        return renderSubSection('Assigning Roles and Permissions', (
          <div className="space-y-4">
            <p>Learn how to assign roles and permissions:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Show Settings</h4>
                <p>Go to the show's page.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Open Collaborators Section</h4>
                <p>Click on the "Collaborators" tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Add Collaborator</h4>
                <p>Click "Add Collaborator" and enter the collaborator's email.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Select Role</h4>
                <p>Choose the role for the collaborator (Editor/Viewer).</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">5. Manage Permissions</h4>
                <p>Set what the collaborator can view and edit.</p>
              </li>
            </ol>
          </div>
        ));

      case 'track-changes':
        return renderSubSection('Tracking Changes and Updates', (
          <div className="space-y-4">
            <p>Learn how to track changes and updates:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Show History</h4>
                <p>Go to the show's page.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. View Changes</h4>
                <p>Click on the "History" tab to see all changes.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Track Changes</h4>
                <p>Review each change and its details.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Manage Updates</h4>
                <p>Apply changes to your show and notify collaborators.</p>
              </li>
            </ol>
          </div>
        ));

      case 'coordinate':
        return renderSubSection('Coordinating Prop Management', (
          <div className="space-y-4">
            <p>Learn how to coordinate prop management:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Prop Management Tools</h4>
                <p>Go to the Props tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Use Collaboration Features</h4>
                <p>Utilize features like sharing and assigning roles.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Set Up Notifications</h4>
                <p>Configure notifications for prop-related activities.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Plan and Schedule</h4>
                <p>Use the calendar to plan prop usage and maintenance.</p>
              </li>
            </ol>
          </div>
        ));

      case 'add-prop-details':
        return renderSubSection('Adding Detailed Prop Information', (
          <div className="space-y-4">
            <p>Learn how to add comprehensive prop details:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Create New Prop</h4>
                <p>Click "Add Prop" in the Props tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Basic Information</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Enter prop name</li>
                  <li>Add description</li>
                  <li>Set quantity</li>
                  <li>Specify dimensions</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Add Images</h4>
                <p>Upload photos or sketches of your prop.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Assign to Scenes</h4>
                <p>Select which acts and scenes the prop appears in.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">5. Additional Details</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Set prop status</li>
                  <li>Add notes</li>
                  <li>Specify handling instructions</li>
                </ul>
              </li>
            </ol>
          </div>
        ));

      case 'reports':
        return renderSubSection('Generating Prop Lists and Reports', (
          <div className="space-y-4">
            <p>Learn how to generate prop lists and reports:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Reports Section</h4>
                <p>Go to the Reports tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Select Report Type</h4>
                <p>Choose the type of report you need (e.g., inventory, usage).</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Filter and Customize</h4>
                <p>Apply filters and customize the report as needed.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Generate Report</h4>
                <p>Click "Generate" to create the report.</p>
              </li>
            </ol>
          </div>
        ));

      case 'create-manage':
        return renderSubSection('Creating and Managing Shows', (
          <div className="space-y-4">
            <p>Learn how to create and manage shows:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Shows Section</h4>
                <p>Go to the Shows tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Create New Show</h4>
                <p>Click "New Show" in the top right corner.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Enter Show Details</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Enter the show name</li>
                  <li>Add a description</li>
                  <li>Set the number of acts</li>
                  <li>Add production details</li>
                </ul>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Add Acts and Scenes</h4>
                <p>Use the act manager to create and organize your show's structure.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">5. Save Your Show</h4>
                <p>Click "Save" to create your show and start adding props.</p>
              </li>
            </ol>
          </div>
        ));

      case 'organize-acts':
        return renderSubSection('Organizing Acts and Scenes', (
          <div className="space-y-4">
            <p>Learn how to organize your show's structure:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Shows Section</h4>
                <p>Go to the Shows tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Edit Show Structure</h4>
                <p>Click the edit button on your show.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Manage Acts</h4>
                <p>Use the act manager to add, edit, and reorder acts.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Manage Scenes</h4>
                <p>Use the scene manager to add, edit, and name scenes.</p>
              </li>
            </ol>
          </div>
        ));

      case 'track-requirements':
        return renderSubSection('Tracking Prop Requirements', (
          <div className="space-y-4">
            <p>Learn how to track prop requirements:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Requirements Section</h4>
                <p>Go to the Requirements tab.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Add New Requirement</h4>
                <p>Click "Add Requirement" and enter the requirement details.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Manage Requirements</h4>
                <p>Use the requirement manager to add, edit, and track requirements.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. View Requirements</h4>
                <p>Use the requirements list to see all current requirements.</p>
              </li>
            </ol>
          </div>
        ));

      case 'plan-transitions':
        return renderSubSection('Planning Prop Transitions', (
          <div className="space-y-4">
            <p>Learn how to plan prop transitions:</p>
            <ol className="space-y-4">
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">1. Access Transition Planner</h4>
                <p>Go to the Transition Planner section.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">2. Select Show and Act</h4>
                <p>Choose the show and act for which you need to plan transitions.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">3. Add Transition</h4>
                <p>Click "Add Transition" and enter the transition details.</p>
              </li>
              <li className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h4 className="font-semibold mb-2">4. Manage Transitions</h4>
                <p>Use the transition manager to add, edit, and manage transitions.</p>
              </li>
            </ol>
          </div>
        ));

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[var(--border-color)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-4">
            {history.length > 1 && (
              <button
                onClick={goBack}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Help Center</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        {activeSubSection ? renderSubSectionContent() : renderMainContent()}
      </div>
    </div>
  );
} 
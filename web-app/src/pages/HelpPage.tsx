import React, { useState } from 'react';
import { 
  Home, 
  Package, 
  Box, 
  Theater, 
  Calendar, 
  Zap, 
  FileText, 
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Users,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const HelpPage: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Get Started',
      icon: Home,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Create Your First Show</h4>
            <p className="text-pb-gray text-sm mb-3">Start by adding a show to organize your props and tasks.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Click "Show Management" in the sidebar</li>
              <li>Click "Add New Show"</li>
              <li>Enter show name, dates, and venue</li>
              <li>Save your show</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Add Props</h4>
            <p className="text-pb-gray text-sm mb-3">Track every prop in your production.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Go to "Props Inventory"</li>
              <li>Click "Add Prop"</li>
              <li>Fill in prop details (name, description, condition)</li>
              <li>Assign to a show</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'props-management',
      title: 'Props Management',
      icon: Package,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Add Props</h4>
            <p className="text-pb-gray text-sm mb-3">Track every item in your production.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Name and description</li>
              <li>Condition and location</li>
              <li>Photos and notes</li>
              <li>Show assignment</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Import Props from CSV</h4>
            <p className="text-pb-gray text-sm mb-3">Upload existing prop lists in bulk.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Click "Import Props" in the sidebar</li>
              <li>Download the template CSV</li>
              <li>Fill in your prop data</li>
              <li>Upload the completed file</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Export Props List</h4>
            <p className="text-pb-gray text-sm mb-3">Generate PDF reports for your team.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Go to "Export Props PDF"</li>
              <li>Select your show</li>
              <li>Choose report format</li>
              <li>Download your PDF</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'shows',
      title: 'Show Management',
      icon: Theater,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Create Shows</h4>
            <p className="text-pb-gray text-sm mb-3">Set up productions with dates and venues.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Show name and description</li>
              <li>Performance dates</li>
              <li>Venue information</li>
              <li>Team members</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Manage Teams</h4>
            <p className="text-pb-gray text-sm mb-3">Invite crew members and assign roles.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Open your show</li>
              <li>Click "Team" tab</li>
              <li>Send invite links</li>
              <li>Assign roles and permissions</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'packing',
      title: 'Packing Lists',
      icon: Box,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Create Packing Lists</h4>
            <p className="text-pb-gray text-sm mb-3">Organize props for transport and storage.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Go to "Packing Lists"</li>
              <li>Click "Create New List"</li>
              <li>Name your list (e.g., "Act 1 Props")</li>
              <li>Add containers and props</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Organize Containers</h4>
            <p className="text-pb-gray text-sm mb-3">Group props in boxes, bags, or bins.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Create containers with names</li>
              <li>Add props to containers</li>
              <li>Generate QR codes for tracking</li>
              <li>Share public links for crew access</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'task-boards',
      title: 'Task Boards',
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Create Task Boards</h4>
            <p className="text-pb-gray text-sm mb-3">Track work with Kanban-style boards.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Go to "Task Boards"</li>
              <li>Click "Create Board"</li>
              <li>Name your board</li>
              <li>Add columns (To Do, In Progress, Done)</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Manage Tasks</h4>
            <p className="text-pb-gray text-sm mb-3">Create and move tasks between columns.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Add task cards with descriptions</li>
              <li>Assign tasks to team members</li>
              <li>Drag cards between columns</li>
              <li>Set due dates and priorities</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'shopping',
      title: 'Shopping Lists',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Track Purchases</h4>
            <p className="text-pb-gray text-sm mb-3">Keep track of props and materials you need to buy.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pb-gray">
              <li>Go to "Shopping List"</li>
              <li>Click "Add Item"</li>
              <li>Enter item details and budget</li>
              <li>Mark as purchased when done</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Budget Tracking</h4>
            <p className="text-pb-gray text-sm mb-3">Monitor spending across your show.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Set budget limits per item</li>
              <li>Track actual vs. planned costs</li>
              <li>View spending summaries</li>
              <li>Export purchase reports</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'search-filters',
      title: 'Search & Filters',
      icon: Search,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Find Props Fast</h4>
            <p className="text-pb-gray text-sm mb-3">Use search and filters to locate items quickly.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Search by name or description</li>
              <li>Filter by show, condition, or location</li>
              <li>Sort by date, name, or status</li>
              <li>Save favorite filter combinations</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Quick Actions</h4>
            <p className="text-pb-gray text-sm mb-3">Keyboard shortcuts for power users.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Ctrl+F: Focus search box</li>
              <li>Ctrl+N: Add new prop</li>
              <li>Ctrl+S: Save current view</li>
              <li>Esc: Clear filters</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: HelpCircle,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Common Issues</h4>
            <div className="space-y-3">
              <div>
                <p className="text-pb-gray text-sm font-medium">Props not showing up?</p>
                <p className="text-pb-gray text-sm">Check your show filter. Make sure you've selected the right show from the dropdown.</p>
              </div>
              <div>
                <p className="text-pb-gray text-sm font-medium">Can't upload photos?</p>
                <p className="text-pb-gray text-sm">Photos must be under 5MB. Try compressing large images or use a different format.</p>
              </div>
              <div>
                <p className="text-pb-gray text-sm font-medium">Team members can't access?</p>
                <p className="text-pb-gray text-sm">Check their email invitation. They need to accept the invite and create an account.</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Get Support</h4>
            <p className="text-pb-gray text-sm mb-3">Need more help? We're here for you.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-pb-gray">
              <li>Click "Report a bug" in the header</li>
              <li>Email support@thepropslist.com</li>
              <li>Check our FAQ for quick answers</li>
              <li>Join our community forum</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pb-darker/80 to-pb-primary/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Help Center</h1>
          <p className="text-pb-gray">Everything you need to manage your theater props like a pro.</p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const Icon = section.icon;
            
            return (
              <div key={section.id} className="bg-pb-darker/50 backdrop-blur-sm border border-pb-primary/20 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-pb-primary/10 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-pb-primary/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-pb-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-pb-gray" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-pb-gray" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-pb-primary/10">
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-pb-primary/10 border border-pb-primary/20 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Still Need Help?</h3>
          <p className="text-pb-gray text-sm mb-4">
            Can't find what you're looking for? Our support team is ready to help.
          </p>
          <div className="flex flex-wrap gap-3">
            <a 
              href="/feedback" 
              className="bg-pb-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pb-primary/80 transition-colors"
            >
              Report a Bug
            </a>
            <a 
              href="mailto:support@thepropslist.com" 
              className="bg-pb-darker/50 text-pb-primary px-4 py-2 rounded-lg text-sm font-medium border border-pb-primary/30 hover:bg-pb-primary/10 transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;

import React from 'react';
import { Activity, Clock, AlertTriangle, Wrench, ArrowLeft } from 'lucide-react';

interface LifecycleHelpContentProps {
  goBack: () => void;
}

export function LifecycleHelpContent({ goBack }: LifecycleHelpContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-semibold">Prop Lifecycle Management</h3>
      </div>

      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
        <p className="text-sm text-[var(--text-secondary)]">
          The Props Bible application now includes comprehensive lifecycle management features
          that allow you to track the complete journey of each prop through your production.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--highlight-color)]" />
          Understanding Prop Lifecycles
        </h4>
        <p>Props in a theatre production go through various stages in their lifecycle:</p>
        <ul className="space-y-2 pl-5 list-disc">
          <li><strong>Confirmed in Show</strong> - The prop is actively being used in the production</li>
          <li><strong>Cut from Show</strong> - The prop has been removed from the production</li>
          <li><strong>Out for Repair</strong> - The prop is currently being repaired</li>
          <li><strong>Damaged - Awaiting Repair</strong> - The prop needs repair but hasn't been sent yet</li>
          <li><strong>Damaged - Awaiting Replacement</strong> - The prop is too damaged and needs replacement</li>
          <li><strong>Missing</strong> - The prop can't be located</li>
          <li><strong>In Transit</strong> - The prop is being moved between locations</li>
          <li><strong>Under Maintenance</strong> - The prop is receiving routine maintenance</li>
          <li><strong>Loaned Out</strong> - The prop has been loaned to another production</li>
          <li><strong>On Hold</strong> - The prop is set aside but might be used later</li>
          <li><strong>Under Review</strong> - The prop's design or suitability is being assessed</li>
          <li><strong>Being Modified</strong> - The prop is being customized or altered</li>
          <li><strong>Backup/Alternate</strong> - The prop is a duplicate or spare</li>
          <li><strong>Temporarily Retired</strong> - The prop is stored for future use</li>
          <li><strong>Ready for Disposal</strong> - The prop is flagged for recycling or disposal</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--highlight-color)]" />
          Managing Prop Status
        </h4>
        <p>You can update a prop's status from the prop detail page:</p>
        <ol className="space-y-3 pl-5 list-decimal">
          <li>
            <p className="font-medium">Navigate to the Prop Detail Page</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Click on any prop in your inventory to open its detail page.
            </p>
          </li>
          <li>
            <p className="font-medium">Find the Lifecycle Management Section</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Scroll down to find the "Prop Lifecycle Management" section.
            </p>
          </li>
          <li>
            <p className="font-medium">Update the Status</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Select a new status from the dropdown menu, add any relevant notes, and click "Update Status".
            </p>
          </li>
          <li>
            <p className="font-medium">Notify Team Members (Optional)</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Check the "Notify team about this status change" option to automatically notify relevant team members
              when critical status changes occur.
            </p>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium flex items-center gap-2">
          <Wrench className="h-5 w-5 text-[var(--highlight-color)]" />
          Recording Maintenance
        </h4>
        <p>Keep track of maintenance and repairs for your props:</p>
        <ol className="space-y-3 pl-5 list-decimal">
          <li>
            <p className="font-medium">Navigate to the Maintenance Tab</p>
            <p className="text-sm text-[var(--text-secondary)]">
              In the Lifecycle Management section, click the "Maintenance Records" tab.
            </p>
          </li>
          <li>
            <p className="font-medium">Add a New Maintenance Record</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Fill out the maintenance form with details about the type of maintenance (repair, routine maintenance, 
              modification, or inspection), the date, who performed it, and any costs involved.
            </p>
          </li>
          <li>
            <p className="font-medium">View Maintenance History</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Below the form, you'll see a history of all maintenance records for this prop.
            </p>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--highlight-color)]" />
          Handling Issues
        </h4>
        <p>The system helps identify props that need attention:</p>
        <ul className="space-y-3 pl-5 list-disc">
          <li>
            <p className="font-medium">Overdue Maintenance Alerts</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Props with overdue inspections or maintenance will be flagged with alerts.
            </p>
          </li>
          <li>
            <p className="font-medium">Critical Status Notifications</p>
            <p className="text-sm text-[var(--text-secondary)]">
              When a prop is marked as damaged, missing, or in need of repair, the system will suggest notifying
              the appropriate team members.
            </p>
          </li>
          <li>
            <p className="font-medium">Return Date Tracking</p>
            <p className="text-sm text-[var(--text-secondary)]">
              For loaned props, the system tracks expected return dates and highlights when items are overdue.
            </p>
          </li>
        </ul>
      </div>

      <div className="p-4 bg-[var(--highlight-color)]/10 rounded-lg">
        <p className="text-sm">
          <strong>Pro Tip:</strong> Set up regular inspection schedules for your most important props to prevent issues
          before they occur. You can set the next inspection date in the lifecycle management section.
        </p>
      </div>
    </div>
  );
} 

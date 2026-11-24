import { type ReactNode, type Ref } from 'react'
import { Icon, type IconName } from '../icon/icon'
import './button.css'

// A button in a menu is one of the items of the menu. The menu moves the focus between its items
// through the ref. Only the current item of the menu has a tabIndex of 0.
interface MenuItemProps {
  readonly ref: Ref<HTMLButtonElement>
  readonly tabIndex: number
}

interface ButtonProps {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly variant?: 'primary' | 'quiet'
  // A small button is shown inside an item of a list, like the button that marks a task as done in
  // the Inbox.
  readonly size?: 'regular' | 'small'
  // The icon before the text, like the plus of the button that adds a reply to the outbox
  readonly icon?: IconName | undefined
  readonly disabled?: boolean
  // A pending button ignores a press until its request has finished. It isn't disabled, because the
  // browser moves the focus away from a button that is disabled. That would close a panel that the
  // button is in before the panel could show the problem of the request.
  readonly pending?: boolean
  // The name that a screen reader reads out instead of the text of the button, like
  // "Mark as done: 4.2 Run the first export" for a button with the text "Mark as done"
  readonly label?: string | undefined
  // The id of the text that describes the button, like the problem of its last request
  readonly describedBy?: string | undefined
  readonly menuItem?: MenuItemProps
}

function classNameOf(
  variant: 'primary' | 'quiet',
  size: 'regular' | 'small',
  icon: IconName | undefined,
): string {
  return [
    'button',
    `button--${variant}`,
    ...(size === 'small' ? ['button--small'] : []),
    ...(icon === undefined ? [] : ['button--icon']),
  ].join(' ')
}

export function Button({
  children,
  onClick,
  variant = 'quiet',
  size = 'regular',
  icon,
  disabled = false,
  pending = false,
  label,
  describedBy,
  menuItem,
}: ButtonProps) {
  return (
    <button
      ref={menuItem?.ref}
      type="button"
      role={menuItem === undefined ? undefined : 'menuitem'}
      tabIndex={menuItem?.tabIndex}
      className={classNameOf(variant, size, icon)}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={pending ? true : undefined}
      onClick={() => {
        if (!pending) {
          onClick()
        }
      }}
      disabled={disabled}
    >
      {icon !== undefined && <Icon name={icon} />}
      {children}
    </button>
  )
}

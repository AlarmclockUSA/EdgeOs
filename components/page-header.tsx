import { FC } from 'react'

interface PageHeaderProps {
  title: string
  subheader?: string
}

export const PageHeader: FC<PageHeaderProps> = ({ title, subheader }) => {
  return (
    <div className="flex justify-between items-center mb-8 pt-8 pl-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{title}</h1>
        {subheader && <p className="mt-2 text-muted-foreground">{subheader}</p>}
      </div>
    </div>
  )
}


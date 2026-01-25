import { InterfaceList } from './InterfaceList'
import InterfaceEditor from './InterfaceEditor'

export default function InterfacePage() {
    return (
        <div className="flex h-screen bg-background">
            <InterfaceList />
            <div className="flex-1 flex flex-col overflow-hidden">
                <InterfaceEditor />
            </div>
        </div>
    )
}

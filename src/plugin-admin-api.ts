import { ModuleBase, ModulesStoreType, PluginBase, IOptions } from 'ninsho-base'
import { DeepPartial, mergeDeep } from 'ninsho-utils'
import { AdminActivate } from './feat-admin-activate'
import { CreateUser } from './feat-create-user'
import { DeleteSessions } from './feat-delete-sessions'
import { DeleteUsers } from './feat-delete-users'
import { SelectUser } from './feat-select-users'
import { UpdateUsers } from './feat-update-users'

// - Code required for each plugin -
const pluginName = 'AdminAPI' // plugin Name
const dependencyModules = ['pool', 'secure'] as const // Required Modules Name

// - boiler template - Specify types only for the modules being used.
export type LendOfHere = {
  options: IOptions,
  modules: Pick<ModulesStoreType, typeof dependencyModules[number]>,
}

export type AdminAPIConfig = {
  unconfirmedDataExpiryDefaultThresholdSec: number,
  searchLimit: number
}

const defaultConfig: AdminAPIConfig = {
  unconfirmedDataExpiryDefaultThresholdSec: 86400,
  searchLimit: 120
}

export class AdminAPI extends PluginBase {

  // - boiler template - 
  readonly pluginName = pluginName

  // - boiler template - store modules
  setModules(
    modules: { [keys: string]: ModuleBase | IOptions }
  ): Omit<this, 'pluginName' | 'config' | 'setModules'> {
    this.storeModules(modules, pluginName, dependencyModules)
    return this
  }

  // - plugin specific options -
  config = {} as AdminAPIConfig
  static init(options: DeepPartial<AdminAPIConfig> = {}) {
    const instance = new this()
    instance.config = mergeDeep(defaultConfig, options) as AdminAPIConfig
    return instance
  }

  adminActivate = AdminActivate.init(this.lend, this.config)
  create = CreateUser.init(this.lend, this.config)
  selectUser = SelectUser.init(this.lend, this.config)
  updateUsers = UpdateUsers.init(this.lend, this.config)
  deleteSessions = DeleteSessions.init(this.lend, this.config)
  deleteUsers = DeleteUsers.init(this.lend, this.config)
}

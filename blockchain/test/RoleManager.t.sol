// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";

contract RoleManagerTest is Test {

    RoleManager public roleManager;

    // Creation of dummy addresses to simulate the various actors described in the thesis
    address public admin = address(this); // The test contract itself will act as the admin
    address public brandIssuer = address(0x1);
    address public serviceCentre = address(0x2);
    address public dealerBoutique = address(0x3);
    address public unauthorizedUser = address(0x4);

    function setUp() public {
        // This function is executed before each individual test
        roleManager = new RoleManager();
    }

    function test_ConstructorAssignsAdminRole() public view {
        // Verify that the admin actually holds the DEFAULT_ADMIN_ROLE
        assertTrue(roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(roleManager.getEntityName(admin), "APTUS System Admin");
    }

    function test_AdminCanGrantIssuerRole() public {
        // The admin grants the role and assigns the KYB identity
        roleManager.grantIssuerRole(brandIssuer, "Rolex");

        // Verify that the brandIssuer now holds the ISSUER_ROLE and identity
        assertTrue(roleManager.hasRole(roleManager.ISSUER_ROLE(), brandIssuer));
        assertEq(roleManager.getEntityName(brandIssuer), "Rolex");
    }

    function test_AdminCanGrantDealerRole() public {
        // The admin grants the role
        roleManager.grantDealerRole(dealerBoutique, "Boutique Paris");

        // Verify that the dealerBoutique now holds the DEALER_ROLE and identity
        assertTrue(roleManager.hasRole(roleManager.DEALER_ROLE(), dealerBoutique));
        assertEq(roleManager.getEntityName(dealerBoutique), "Boutique Paris");
    }

    function test_AdminCanGrantServiceRole() public {
        // The admin grants the role
        roleManager.grantServiceRole(serviceCentre, "Service Geneva");

        // Verify that the serviceCentre now holds the SERVICE_ROLE and identity
        assertTrue(roleManager.hasRole(roleManager.SERVICE_ROLE(), serviceCentre));
        assertEq(roleManager.getEntityName(serviceCentre), "Service Geneva");
    }

    function test_AdminCanRevokeIssuerRole() public {
        // Grant first, then revoke
        roleManager.grantIssuerRole(brandIssuer, "Rolex");
        assertTrue(roleManager.hasRole(roleManager.ISSUER_ROLE(), brandIssuer));

        roleManager.revokeIssuerRole(brandIssuer);

        // Verify role is removed and entity name is cleared
        assertFalse(roleManager.hasRole(roleManager.ISSUER_ROLE(), brandIssuer));
        assertEq(roleManager.getEntityName(brandIssuer), "");
    }

    function test_RevertWhen_UnauthorizedUserGrantsRole() public {
        // vm.prank tells Foundry: "The next transaction will be sent by unauthorizedUser"
        vm.prank(unauthorizedUser);
        
        // vm.expectRevert tells Foundry: "I expect the next transaction to revert (fail)"
        vm.expectRevert();
        
        // The unauthorized user tries to grant a role (and it must fail)
        roleManager.grantIssuerRole(brandIssuer, "Rolex");

        // Test identical verification for the Dealer Role
        vm.prank(unauthorizedUser);
        vm.expectRevert();
        roleManager.grantDealerRole(dealerBoutique, "Boutique Paris");
    }

    function test_IdentityPersistsWhenMultipleRolesHeld() public {
        // Assegniamo due ruoli diversi allo stesso wallet con lo stesso nome
        roleManager.grantIssuerRole(brandIssuer, "Rolex Group");
        roleManager.grantServiceRole(brandIssuer, "Rolex Group");

        // Verifico che l'identità sia impostata
        assertEq(roleManager.getEntityName(brandIssuer), "Rolex Group");

        // Revoco solo il ruolo di Service
        roleManager.revokeServiceRole(brandIssuer);

        // Il wallet ha ancora il ruolo Issuer, quindi il nome "Rolex Group" NON deve essere stato cancellato!
        assertTrue(roleManager.hasRole(roleManager.ISSUER_ROLE(), brandIssuer));
        assertEq(roleManager.getEntityName(brandIssuer), "Rolex Group");
    }
}
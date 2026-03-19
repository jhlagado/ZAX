; ZAX lowered .asm trace
; range: $0100..$8061 (end exclusive)

; func binary_search begin
binary_search:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0000                   ; 0108: 21 00 00
push HL                        ; 010B: E5
ld HL, $0000                   ; 010C: 21 00 00
push HL                        ; 010F: E5
ld HL, $0000                   ; 0110: 21 00 00
push HL                        ; 0113: E5
ld HL, $0000                   ; 0114: 21 00 00
push HL                        ; 0117: E5
push AF                        ; 0118: F5
push BC                        ; 0119: C5
push DE                        ; 011A: D5
ld HL, LastIndex               ; 011B: 21 07 00
ex DE, HL                      ; 011E: EB
ld (IX - $0004), E             ; 011F: DD 73 FC
ld (IX - $0003), D             ; 0122: DD 72 FD
ex DE, HL                      ; 0125: EB
ld A, $0001                    ; 0126: 3E 01
or A                           ; 0128: B7
__zax_while_cond_1:
jp z, __zax_while_end_2        ; 0129: CA 00 00
ex DE, HL                      ; 012C: EB
ld E, (IX - $0002)             ; 012D: DD 5E FE
ld D, (IX - $0001)             ; 0130: DD 56 FF
ex DE, HL                      ; 0133: EB
ld E, (IX - $0004)             ; 0134: DD 5E FC
ld D, (IX - $0003)             ; 0137: DD 56 FD
xor A                          ; 013A: AF
sbc HL, DE                     ; 013B: ED 52
jp c, __zax_if_else_3          ; 013D: DA 00 00
jp z, __zax_if_else_5          ; 0140: CA 00 00
ld HL, $FFFF                   ; 0143: 21 FF FF
jp __zax_epilogue_0            ; 0146: C3 00 00
__zax_if_else_3:
__zax_if_else_5:
ex DE, HL                      ; 0149: EB
ld E, (IX - $0002)             ; 014A: DD 5E FE
ld D, (IX - $0001)             ; 014D: DD 56 FF
ex DE, HL                      ; 0150: EB
ld E, (IX - $0004)             ; 0151: DD 5E FC
ld D, (IX - $0003)             ; 0154: DD 56 FD
add HL, DE                     ; 0157: 19
srl H                          ; 0158: CB 3C
rr L                           ; 015A: CB 1D
ex DE, HL                      ; 015C: EB
ld (IX - $0006), E             ; 015D: DD 73 FA
ld (IX - $0005), D             ; 0160: DD 72 FB
ex DE, HL                      ; 0163: EB
ex DE, HL                      ; 0164: EB
ld E, (IX - $0006)             ; 0165: DD 5E FA
ld D, (IX - $0005)             ; 0168: DD 56 FB
ex DE, HL                      ; 016B: EB
push DE                        ; 016C: D5
push HL                        ; 016D: E5
ld de, values                  ; 016E: 11 00 00
ld H, $0000                    ; 0171: 26 00
ld L, L                        ; 0173: 6D
add HL, DE                     ; 0174: 19
ld A, (HL)                     ; 0175: 7E
pop HL                         ; 0176: E1
pop DE                         ; 0177: D1
ld (ix-$08), A                 ; 0178: DD 77 F8
ld A, (ix+$04)                 ; 017B: DD 7E 04
ld B, (ix-$08)                 ; 017E: DD 46 F8
cp B                           ; 0181: B8
jp nz, __zax_if_else_7         ; 0182: C2 00 00
ex DE, HL                      ; 0185: EB
ld E, (IX - $0006)             ; 0186: DD 5E FA
ld D, (IX - $0005)             ; 0189: DD 56 FB
ex DE, HL                      ; 018C: EB
jp __zax_epilogue_0            ; 018D: C3 00 00
__zax_if_else_7:
jp nc, __zax_if_else_9         ; 0190: D2 00 00
push DE                        ; 0193: D5
ld E, (IX - $0006)             ; 0194: DD 5E FA
ld D, (IX - $0005)             ; 0197: DD 56 FB
ld (IX - $0004), E             ; 019A: DD 73 FC
ld (IX - $0003), D             ; 019D: DD 72 FD
pop DE                         ; 01A0: D1
push DE                        ; 01A1: D5
push BC                        ; 01A2: C5
push AF                        ; 01A3: F5
ld E, (IX - $0004)             ; 01A4: DD 5E FC
ld D, (IX - $0003)             ; 01A7: DD 56 FD
dec DE                         ; 01AA: 1B
ld (IX - $0004), E             ; 01AB: DD 73 FC
ld (IX - $0003), D             ; 01AE: DD 72 FD
ld A, D                        ; 01B1: 7A
or E                           ; 01B2: B3
pop BC                         ; 01B3: C1
ld A, B                        ; 01B4: 78
pop BC                         ; 01B5: C1
pop DE                         ; 01B6: D1
__zax_if_else_9:
jp c, __zax_if_else_11         ; 01B7: DA 00 00
jp z, __zax_if_else_13         ; 01BA: CA 00 00
push DE                        ; 01BD: D5
ld E, (IX - $0006)             ; 01BE: DD 5E FA
ld D, (IX - $0005)             ; 01C1: DD 56 FB
ld (IX - $0002), E             ; 01C4: DD 73 FE
ld (IX - $0001), D             ; 01C7: DD 72 FF
pop DE                         ; 01CA: D1
push DE                        ; 01CB: D5
push BC                        ; 01CC: C5
push AF                        ; 01CD: F5
ld E, (IX - $0002)             ; 01CE: DD 5E FE
ld D, (IX - $0001)             ; 01D1: DD 56 FF
inc DE                         ; 01D4: 13
ld (IX - $0002), E             ; 01D5: DD 73 FE
ld (IX - $0001), D             ; 01D8: DD 72 FF
ld A, D                        ; 01DB: 7A
or E                           ; 01DC: B3
pop BC                         ; 01DD: C1
ld A, B                        ; 01DE: 78
pop BC                         ; 01DF: C1
pop DE                         ; 01E0: D1
__zax_if_else_11:
__zax_if_else_13:
ld A, $0001                    ; 01E1: 3E 01
or A                           ; 01E3: B7
jp __zax_while_cond_1          ; 01E4: C3 00 00
__zax_while_end_2:
ld HL, $FFFF                   ; 01E7: 21 FF FF
__zax_epilogue_0:
pop DE                         ; 01EA: D1
pop BC                         ; 01EB: C1
pop AF                         ; 01EC: F1
ld SP, IX                      ; 01ED: DD F9
pop IX                         ; 01EF: DD E1
ret                            ; 01F1: C9
; func binary_search end
; func main begin
main:
push IX                        ; 01F2: DD E5
ld IX, $0000                   ; 01F4: DD 21 00 00
add IX, SP                     ; 01F8: DD 39
push AF                        ; 01FA: F5
push BC                        ; 01FB: C5
push DE                        ; 01FC: D5
push HL                        ; 01FD: E5
ld HL, $000C                   ; 01FE: 21 0C 00
push HL                        ; 0201: E5
call binary_search             ; 0202: CD 00 00
inc SP                         ; 0205: 33
inc SP                         ; 0206: 33
__zax_epilogue_15:
pop HL                         ; 0207: E1
pop DE                         ; 0208: D1
pop BC                         ; 0209: C1
pop AF                         ; 020A: F1
ld SP, IX                      ; 020B: DD F9
pop IX                         ; 020D: DD E1
ret                            ; 020F: C9
; func main end

; symbols:
; label binary_search = $0100
; label __zax_while_cond_1 = $0129
; label __zax_if_else_3 = $0149
; label __zax_if_else_5 = $0149
; label __zax_if_else_7 = $0190
; label __zax_if_else_9 = $01B7
; label __zax_if_else_11 = $01E1
; label __zax_if_else_13 = $01E1
; label __zax_while_end_2 = $01E7
; label __zax_epilogue_0 = $01EA
; label main = $01F2
; label __zax_epilogue_15 = $0207
; data values = $8000
; label __zax_startup = $8008
; constant ItemCount = $0008 (8)
; constant LastIndex = $0007 (7)

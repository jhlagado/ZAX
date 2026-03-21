; ZAX lowered .asm trace
; range: $0100..$8076 (end exclusive)

; func next_slot begin
next_slot:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld A, (ix+$04)                 ; 010B: DD 7E 04
inc A                          ; 010E: 3C
cp Capacity                    ; 010F: FE 05
jp nc, __zax_if_else_1         ; 0111: D2 00 00
ld H, $0000                    ; 0114: 26 00
ld L, A                        ; 0116: 6F
jp __zax_epilogue_0            ; 0117: C3 00 00
__zax_if_else_1:
ld HL, $0000                   ; 011A: 21 00 00
__zax_epilogue_0:
pop DE                         ; 011D: D1
pop BC                         ; 011E: C1
pop AF                         ; 011F: F1
ld SP, IX                      ; 0120: DD F9
pop IX                         ; 0122: DD E1
ret                            ; 0124: C9
; func enqueue begin
; func next_slot end
enqueue:
push IX                        ; 0125: DD E5
ld IX, $0000                   ; 0127: DD 21 00 00
add IX, SP                     ; 012B: DD 39
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
push HL                        ; 0130: E5
ld A, (used_slots)             ; 0131: 3A 00 00
cp Capacity                    ; 0134: FE 05
jp c, __zax_if_else_4          ; 0136: DA 00 00
jp __zax_epilogue_3            ; 0139: C3 00 00
__zax_if_else_4:
push AF                        ; 013C: F5
ld A, (tail_slot)              ; 013D: 3A 00 00
ld B, A                        ; 0140: 47
pop AF                         ; 0141: F1
ld A, (ix+$04)                 ; 0142: DD 7E 04
push AF                        ; 0145: F5
ld H, $0000                    ; 0146: 26 00
ld L, B                        ; 0148: 68
push DE                        ; 0149: D5
ld D, H                        ; 014A: 54
ld E, L                        ; 014B: 5D
add HL, HL                     ; 014C: 29
add HL, DE                     ; 014D: 19
pop DE                         ; 014E: D1
ld DE, entries                 ; 014F: 11 00 00
add HL, DE                     ; 0152: 19
push HL                        ; 0153: E5
pop HL                         ; 0154: E1
push HL                        ; 0155: E5
pop HL                         ; 0156: E1
ld (hl), A                     ; 0157: 77
pop AF                         ; 0158: F1
push DE                        ; 0159: D5
push HL                        ; 015A: E5
ld E, (IX + $0006)             ; 015B: DD 5E 06
ld D, (IX + $0007)             ; 015E: DD 56 07
ld H, $0000                    ; 0161: 26 00
ld L, B                        ; 0163: 68
push DE                        ; 0164: D5
ld D, H                        ; 0165: 54
ld E, L                        ; 0166: 5D
add HL, HL                     ; 0167: 29
add HL, DE                     ; 0168: 19
pop DE                         ; 0169: D1
ld DE, entries                 ; 016A: 11 00 00
add HL, DE                     ; 016D: 19
push HL                        ; 016E: E5
pop HL                         ; 016F: E1
ld DE, $0001                   ; 0170: 11 01 00
add HL, DE                     ; 0173: 19
push HL                        ; 0174: E5
pop HL                         ; 0175: E1
ld (HL), E                     ; 0176: 73
inc HL                         ; 0177: 23
ld (HL), D                     ; 0178: 72
pop HL                         ; 0179: E1
pop DE                         ; 017A: D1
ld A, (tail_slot)              ; 017B: 3A 00 00
ld H, $0000                    ; 017E: 26 00
ld L, A                        ; 0180: 6F
push HL                        ; 0181: E5
call next_slot                 ; 0182: CD 00 00
inc SP                         ; 0185: 33
inc SP                         ; 0186: 33
ld A, L                        ; 0187: 7D
ld (tail_slot), A              ; 0188: 32 00 00
push DE                        ; 018B: D5
push HL                        ; 018C: E5
ld HL, used_slots              ; 018D: 21 00 00
ld E, (HL)                     ; 0190: 5E
inc E                          ; 0191: 1C
ld (HL), E                     ; 0192: 73
pop HL                         ; 0193: E1
pop DE                         ; 0194: D1
__zax_epilogue_3:
pop HL                         ; 0195: E1
pop DE                         ; 0196: D1
pop BC                         ; 0197: C1
pop AF                         ; 0198: F1
ld SP, IX                      ; 0199: DD F9
pop IX                         ; 019B: DD E1
ret                            ; 019D: C9
; func dequeue begin
; func enqueue end
dequeue:
push IX                        ; 019E: DD E5
ld IX, $0000                   ; 01A0: DD 21 00 00
add IX, SP                     ; 01A4: DD 39
ld HL, $0000                   ; 01A6: 21 00 00
push HL                        ; 01A9: E5
push AF                        ; 01AA: F5
push BC                        ; 01AB: C5
push DE                        ; 01AC: D5
ld A, (used_slots)             ; 01AD: 3A 00 00
or A                           ; 01B0: B7
jp nz, __zax_if_else_7         ; 01B1: C2 00 00
ld HL, $FFFF                   ; 01B4: 21 FF FF
jp __zax_epilogue_6            ; 01B7: C3 00 00
__zax_if_else_7:
push AF                        ; 01BA: F5
ld A, (head_slot)              ; 01BB: 3A 00 00
ld L, A                        ; 01BE: 6F
pop AF                         ; 01BF: F1
ld H, $0000                    ; 01C0: 26 00
ld L, L                        ; 01C2: 6D
push DE                        ; 01C3: D5
ld D, H                        ; 01C4: 54
ld E, L                        ; 01C5: 5D
add HL, HL                     ; 01C6: 29
add HL, DE                     ; 01C7: 19
pop DE                         ; 01C8: D1
ld DE, entries                 ; 01C9: 11 00 00
add HL, DE                     ; 01CC: 19
push HL                        ; 01CD: E5
pop HL                         ; 01CE: E1
push HL                        ; 01CF: E5
pop HL                         ; 01D0: E1
ld A, (hl)                     ; 01D1: 7E
ld (ix-$02), A                 ; 01D2: DD 77 FE
ld A, (head_slot)              ; 01D5: 3A 00 00
ld H, $0000                    ; 01D8: 26 00
ld L, A                        ; 01DA: 6F
push HL                        ; 01DB: E5
call next_slot                 ; 01DC: CD 00 00
inc SP                         ; 01DF: 33
inc SP                         ; 01E0: 33
ld A, L                        ; 01E1: 7D
ld (head_slot), A              ; 01E2: 32 00 00
push DE                        ; 01E5: D5
push HL                        ; 01E6: E5
ld HL, used_slots              ; 01E7: 21 00 00
ld E, (HL)                     ; 01EA: 5E
dec E                          ; 01EB: 1D
ld (HL), E                     ; 01EC: 73
pop HL                         ; 01ED: E1
pop DE                         ; 01EE: D1
ld H, $0000                    ; 01EF: 26 00
ld A, (ix-$02)                 ; 01F1: DD 7E FE
ld L, A                        ; 01F4: 6F
__zax_epilogue_6:
pop DE                         ; 01F5: D1
pop BC                         ; 01F6: C1
pop AF                         ; 01F7: F1
ld SP, IX                      ; 01F8: DD F9
pop IX                         ; 01FA: DD E1
ret                            ; 01FC: C9
; func dequeue end
; func main begin
main:
push IX                        ; 01FD: DD E5
ld IX, $0000                   ; 01FF: DD 21 00 00
add IX, SP                     ; 0203: DD 39
push AF                        ; 0205: F5
push BC                        ; 0206: C5
push DE                        ; 0207: D5
push HL                        ; 0208: E5
ld HL, $0064                   ; 0209: 21 64 00
push HL                        ; 020C: E5
ld HL, $0007                   ; 020D: 21 07 00
push HL                        ; 0210: E5
call enqueue                   ; 0211: CD 00 00
inc SP                         ; 0214: 33
inc SP                         ; 0215: 33
inc SP                         ; 0216: 33
inc SP                         ; 0217: 33
ld HL, $0065                   ; 0218: 21 65 00
push HL                        ; 021B: E5
ld HL, $0009                   ; 021C: 21 09 00
push HL                        ; 021F: E5
call enqueue                   ; 0220: CD 00 00
inc SP                         ; 0223: 33
inc SP                         ; 0224: 33
inc SP                         ; 0225: 33
inc SP                         ; 0226: 33
call dequeue                   ; 0227: CD 00 00
__zax_epilogue_9:
pop HL                         ; 022A: E1
pop DE                         ; 022B: D1
pop BC                         ; 022C: C1
pop AF                         ; 022D: F1
ld SP, IX                      ; 022E: DD F9
pop IX                         ; 0230: DD E1
ret                            ; 0232: C9
; func main end

; symbols:
; label next_slot = $0100
; label __zax_if_else_1 = $011A
; label __zax_epilogue_0 = $011D
; label enqueue = $0125
; label __zax_if_else_4 = $013C
; label __zax_epilogue_3 = $0195
; label dequeue = $019E
; label __zax_if_else_7 = $01BA
; label __zax_epilogue_6 = $01F5
; label main = $01FD
; label __zax_epilogue_9 = $022A
; data entries = $8000
; data head_slot = $800F
; data tail_slot = $8010
; data used_slots = $8011
; label __zax_startup = $8012
; constant Capacity = $0005 (5)

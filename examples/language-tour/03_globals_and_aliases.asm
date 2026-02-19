; ZAX lowered .asm trace
; range: $0100..$0149 (end exclusive)

; func read_counter begin
read_counter:
push AF                        ; 0100: F5
push BC                        ; 0101: C5
push DE                        ; 0102: D5
ld HL, (counter)               ; 0103: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 0106: D1
pop BC                         ; 0107: C1
pop AF                         ; 0108: F1
ret                            ; 0109: C9
; func read_counter end
; func write_counter begin
write_counter:
push IX                        ; 010A: DD E5
ld IX, $0000                   ; 010C: DD 21 00 00
add IX, SP                     ; 0110: DD 39
push AF                        ; 0112: F5
push BC                        ; 0113: C5
push DE                        ; 0114: D5
push HL                        ; 0115: E5
push IX                        ; 0116: DD E5
pop HL                         ; 0118: E1
push DE                        ; 0119: D5
ld DE, $0004                   ; 011A: 11 04 00
add HL, DE                     ; 011D: 19
pop DE                         ; 011E: D1
ld a, (hl) ; inc hl ; ld h, (hl) ; ld l, a ; 011F: 7E 23 66 6F
push HL                        ; 0123: E5
ld HL, counter                 ; 0124: 21 00 00
pop DE                         ; 0127: D1
ld (hl), e ; inc hl ; ld (hl), d ; 0128: 73 23 72
__zax_epilogue_1:
pop HL                         ; 012B: E1
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld SP, IX                      ; 012F: DD F9
pop IX                         ; 0131: DD E1
ret                            ; 0133: C9
; func main begin
; func write_counter end
main:
push AF                        ; 0134: F5
push BC                        ; 0135: C5
push DE                        ; 0136: D5
push HL                        ; 0137: E5
ld HL, $007B                   ; 0138: 21 7B 00
push HL                        ; 013B: E5
call write_counter             ; 013C: CD 00 00
inc SP                         ; 013F: 33
inc SP                         ; 0140: 33
ld HL, (counter)               ; 0141: 2A 00 00
__zax_epilogue_2:
pop HL                         ; 0144: E1
pop DE                         ; 0145: D1
pop BC                         ; 0146: C1
pop AF                         ; 0147: F1
ret                            ; 0148: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $0106
; label write_counter = $010A
; label __zax_epilogue_1 = $012B
; label main = $0134
; label __zax_epilogue_2 = $0144
; var counter = $014A
